const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { buildSync } = require("esbuild");
const { runInNewContext } = require("node:vm");
const OpenAI = require("openai");
const LZString = require("lz-string");

function writable(value) {
  return {
    set(next) { value = next; },
    subscribe(callback) { callback(value); return () => {}; },
  };
}
function get(store) {
  let value;
  store.subscribe((next) => { value = next; })();
  return value;
}
const stores = { writable, get };

class FileReaderMock {
  readAsDataURL(blob) {
    blob.arrayBuffer().then((bytes) => {
      this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString("base64")}`;
      this.onload();
    });
  }
}

function load(source, dependencies = {}, globals = {}, filename = "fixture.ts") {
  const { outputFiles } = buildSync({
    stdin: { contents: source, loader: "ts", resolveDir: process.cwd(), sourcefile: filename },
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    external: ["openai", "svelte", "svelte/store", "lz-string", "../lib/*"],
  });
  const result = { exports: {} };
  runInNewContext(outputFiles[0].text, {
    module: result,
    exports: result.exports,
    require: (name) => dependencies[name] ?? require(name),
    Request, Response, Headers, URL, Blob, FileReader: FileReaderMock,
    Error, console, setTimeout, clearTimeout,
    ...globals,
  });
  return result.exports;
}

function service(fetch = async () => { throw new Error("Unexpected request"); }) {
  const options = [];
  class CompatibleClient extends OpenAI {
    constructor(config) { options.push(config); super({ ...config, fetch }); }
  }
  class AzureClient extends OpenAI.AzureOpenAI {
    constructor(config) { options.push(config); super({ ...config, fetch }); }
  }
  const result = load(readFileSync("src/lib/OpenAIGPT4VisionService.ts", "utf8"), {
    openai: { __esModule: true, default: CompatibleClient, AzureOpenAI: AzureClient },
    "svelte/store": stores,
  });
  result.openAiApiKey.set("test-key");
  return { ...result, options };
}

function streamResponse(text = "transcribed text", finishReason = "stop") {
  const chunks = [
    { choices: [{ delta: { content: text }, finish_reason: null }] },
    { choices: [{ delta: {}, finish_reason: finishReason }] },
    // Usage-only chunks must not erase the finish reason.
    { choices: [], usage: { total_tokens: 10 } },
  ];
  return new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n", {
    status: 200, headers: { "content-type": "text/event-stream" },
  });
}
const image = () => new Blob(["test-image"], { type: "image/png" });

test("OpenAI, OpenRouter, and local endpoints stream vision-only requests with the selected model", async () => {
  for (const [baseUrl, model] of [
    ["https://api.openai.com/v1", "gpt-4o"],
    ["https://openrouter.ai/api/v1/", "openai/gpt-4o"],
    ["http://localhost:1234/v1", "local-vision-model"],
  ]) {
    const requests = [];
    const api = service(async (url, init) => { requests.push({ url, init }); return streamResponse("  transcription  "); });
    api.openAiBaseUrl.set(baseUrl);
    api.openAiModel.set(model);
    const callbacks = [];
    assert.equal(await api.transcribeImage(image(), [], (...args) => callbacks.push(args)), "transcription");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, `${baseUrl.replace(/\/$/, "")}/chat/completions`);
    const body = JSON.parse(requests[0].init.body);
    assert.equal(body.model, model);
    assert.equal(body.stream, true);
    assert.equal(body.max_tokens, undefined);
    assert.match(body.messages[1].content[1].image_url.url, /^data:image\/png;base64,/);
    assert.doesNotMatch(JSON.stringify(body), /OCR/);
    assert.equal(api.options[0].apiKey, "test-key");
    assert.equal(api.options[0].maxRetries, 0);
    assert.deepEqual(callbacks.at(-1), ["transcription", true]);
  }
});

test("Azure OpenAI is preserved without requiring Azure OCR", async () => {
  let request;
  const api = service(async (url, init) => { request = { url, init }; return streamResponse(); });
  api.useAzureOpenAI.set(true);
  api.azureOpenAiEndpoint.set("https://example.openai.azure.com");
  api.azureOpenAiDeployment.set("vision-deployment");
  api.azureOpenAiKey.set("azure-test-key");
  api.azureOpenAiVersion.set("2024-06-01");
  assert.equal(await api.transcribeImage(image(), [], () => {}), "transcribed text");
  assert.match(request.url, /openai\/deployments\/vision-deployment\/chat\/completions/);
  assert.match(request.url, /api-version=2024-06-01/);
  assert.equal(JSON.parse(request.init.body).model, "vision-deployment");
  assert.equal(api.options[0].maxRetries, 0);
});

test("threaded context and custom prompt preserve current-image-only instructions", async () => {
  let body;
  const api = service(async (_, init) => { body = JSON.parse(init.body); return streamResponse(); });
  api.customExtraPrompt.set("Preserve line breaks.");
  await api.transcribeImage(image(), ["Previous page"], () => {});
  assert.match(body.messages[0].content, /Previous page/);
  assert.match(body.messages[0].content, /Output only text from the current image/);
  assert.match(body.messages[0].content, /Preserve line breaks/);
});

for (const [status, code, message, expected] of [
  [429, "insufficient_quota", "Quota exceeded", /Not enough API credits/],
  [402, null, "Insufficient credits", /Not enough API credits/],
  [403, "insufficient_credits", "Balance too low", /Not enough API credits/],
  [429, null, "Insufficient balance", /Not enough API credits/],
  [429, "rate_limit_exceeded", "Too many requests", /rate limit/],
  [401, "invalid_api_key", "Invalid key", /Authentication failed/],
  [404, "model_not_found", "Unknown model", /Endpoint or model not found/],
  [400, "invalid_image", "Model does not support image input", /HTTP 400.*image input/],
  [500, null, "Provider unavailable", /HTTP 500.*Provider unavailable/],
]) {
  test(`HTTP ${status} (${code ?? message}) produces actionable guidance without retries`, async () => {
    let requests = 0;
    const api = service(async () => {
      requests++;
      return Response.json({ error: { code, message } }, { status });
    });
    await assert.rejects(api.transcribeImage(image(), [], () => {}), (error) => {
      assert.match(api.formatModelError(error), expected);
      return true;
    });
    assert.equal(requests, 1);
  });
}

test("network and timeout guidance explains browser endpoint restrictions", async () => {
  const api = service(async () => { throw new Error("Failed to fetch"); });
  await assert.rejects(api.transcribeImage(image(), [], () => {}), (error) => {
    assert.match(api.formatModelError(error), /CORS/);
    return true;
  });
  assert.match(api.formatModelError(new OpenAI.APIConnectionTimeoutError()), /timed out/);
});

for (const [reason, text, expected] of [
  ["length", "partial", /output limit.*incomplete/],
  ["content_filter", "", /declined/],
  [null, "partial", /ended unexpectedly/],
  ["stop", "", /no transcription/],
]) {
  test(`unusable stream (${reason}) never calls the completion callback`, async () => {
    const api = service(async () => streamResponse(text, reason));
    let finished = false;
    await assert.rejects(api.transcribeImage(image(), [], (_, done) => { finished ||= done; }), expected);
    assert.equal(finished, false);
  });
}

test("invalid configuration and unsupported images fail before network requests", async () => {
  const api = service();
  for (const url of ["", "invalid", "file:///test", "https://user:secret@example.com/v1", "https://example.com/v1?secret=key", "https://example.com/v1#fragment", "https://example.com/v1/chat/completions"]) {
    assert.throws(() => api.validateBaseUrl(url), /API base URL/);
  }
  api.openAiApiKey.set(" ");
  await assert.rejects(api.transcribeImage(image(), [], () => {}), /API key/);
  api.openAiApiKey.set("key");
  api.openAiModel.set(" ");
  await assert.rejects(api.transcribeImage(image(), [], () => {}), /model ID/);
  api.openAiModel.set("vision");
  await assert.rejects(api.transcribeImage(new Blob(["heic"], { type: "image/heic" }), [], () => {}), /Unsupported image format/);
  api.useAzureOpenAI.set(true);
  await assert.rejects(api.transcribeImage(image(), [], () => {}), /Azure OpenAI endpoint/);
});

test("mid-stream provider errors retain actionable credit guidance", async () => {
  const api = service(async () => new Response(
    'data: {"error":{"code":"insufficient_quota","message":"Insufficient credits"}}\n\n',
    { headers: { "content-type": "text/event-stream" } }
  ));
  await assert.rejects(api.transcribeImage(image(), [], () => {}), (error) => {
    assert.match(api.formatModelError(error), /Not enough API credits/);
    return true;
  });
});

test("a model refusal is not accepted as an empty successful transcription", async () => {
  const api = service(async () => new Response(
    'data: {"choices":[{"delta":{"refusal":"Cannot transcribe"},"finish_reason":"stop"}]}\n\n' +
    'data: [DONE]\n\n',
    { headers: { "content-type": "text/event-stream" } }
  ));
  await assert.rejects(api.transcribeImage(image(), [], () => {}), /declined/);
});

function componentScript(path, exports) {
  const source = readFileSync(path, "utf8");
  // Exercise the actual component's script while the Svelte check/build validate its template.
  return source.match(/<script lang="ts">([\s\S]*?)<\/script>/)[1] + exports;
}

function uploadFixture(transcribeImage) {
  const api = { transcribeImage, formatModelError: (error) => error.message, threadOutputsFromOneRequestToTheNext: writable(false) };
  const toast = writable("");
  const revoked = [];
  let cleanup;
  const component = load(componentScript("src/components/ImageUploadForm.svelte", `
    export { processImages, clearSession, removeImage };
    export function setImages(files) { sessionImages = files.map((file, index) => new SessionImage("blob:" + index, file)); }
    export function state() { return { sessionImages, isProcessing }; }
  `), {
    "../lib/OpenAIGPT4VisionService": api,
    "../lib/toastService": { toastMessage: toast },
    "svelte/store": stores,
    svelte: { onDestroy: (callback) => { cleanup = callback; } },
  }, {
    window: { addEventListener() {}, removeEventListener() {} },
    URL: { revokeObjectURL: (url) => revoked.push(url) },
    console: { error() {} },
  });
  component.setImages(["page-1", "page-2"]);
  return { ...component, api, toast, revoked, cleanup: () => cleanup() };
}

test("parallel processing calls both models and awaits every image instead of skipping loading images", async () => {
  const pending = [];
  const fixture = uploadFixture((file, previous, callback) => new Promise((resolve) => {
    pending.push({ file, resolve: () => { callback(file, true); resolve(file); } });
  }));
  const operation = fixture.processImages();
  assert.equal(pending.length, 2);
  assert.equal(fixture.state().isProcessing, true);
  assert.equal(fixture.state().sessionImages.every((image) => image.isLoading), true);
  await fixture.processImages();
  assert.equal(pending.length, 2);
  pending.forEach((request) => request.resolve());
  await operation;
  assert.equal(fixture.state().isProcessing, false);
  assert.deepEqual(Array.from(fixture.state().sessionImages, (image) => image.correctedText), ["page-1", "page-2"]);
  assert.equal(fixture.state().sessionImages.every((image) => !image.isLoading && !image.isStreaming), true);
});

test("sequential processing passes only completed previous text", async () => {
  const contexts = [];
  const fixture = uploadFixture(async (file, previous, callback) => {
    contexts.push([...previous]);
    callback(file, true);
    return file;
  });
  fixture.api.threadOutputsFromOneRequestToTheNext.set(true);
  await fixture.processImages();
  assert.deepEqual(contexts, [[], ["page-1"]]);
});

test("sequential errors stop later requests, release loading flags, and retain partial text visibly", async () => {
  let requests = 0;
  const fixture = uploadFixture(async (_, previous, callback) => {
    requests++;
    callback("partial", false);
    throw new Error("Not enough API credits");
  });
  fixture.api.threadOutputsFromOneRequestToTheNext.set(true);
  await fixture.processImages();
  assert.equal(requests, 1);
  const state = fixture.state();
  assert.equal(state.isProcessing, false);
  assert.equal(state.sessionImages[0].isLoading, false);
  assert.equal(state.sessionImages[0].isStreaming, false);
  assert.equal(state.sessionImages[0].error, "Not enough API credits");
  assert.equal(state.sessionImages[0].correctedText, "partial");
  assert.equal(state.sessionImages[1].isLoading, false);
  assert.match(get(fixture.toast), /Not enough API credits.*remaining images were not sent/);
});

test("parallel failures do not hang or hide another image's successful result", async () => {
  const fixture = uploadFixture(async (file, previous, callback) => {
    if (file === "page-1") throw new Error("Invalid key");
    callback("success", true);
    return "success";
  });
  await fixture.processImages();
  assert.equal(fixture.state().isProcessing, false);
  assert.equal(fixture.state().sessionImages[0].error, "Invalid key");
  assert.equal(fixture.state().sessionImages[1].correctedText, "success");
});

test("removing and clearing images release preview URLs", () => {
  const fixture = uploadFixture();
  fixture.removeImage(0);
  fixture.clearSession();
  assert.deepEqual(fixture.revoked, ["blob:0", "blob:1"]);
  assert.equal(fixture.state().sessionImages.length, 0);
  fixture.cleanup();
});

function settingsFixture(initial = {}) {
  const local = new Map(Object.entries(initial));
  const api = service();
  let mounted;
  let promptResponse;
  let exportedConfig;
  const alerts = [];
  const component = load(componentScript("src/components/ApiKeysForm.svelte", `
    export { saveApiKeys, importConfig, exportConfig };
    export function state() { return { isFormOpen, l_openAiKey, l_openAiBaseUrl, l_openAiModel }; }
  `), {
    "../lib/OpenAIGPT4VisionService": api,
    "../lib/LocalStorage": {
      getFromLocalStorage: (key) => local.get(key) ?? null,
      saveToLocalStorage: (key, value) => local.set(key, value),
    },
    svelte: { onMount: (callback) => { mounted = callback; } },
    "lz-string": LZString,
  }, {
    localStorage: { removeItem: (key) => local.delete(key) },
    prompt: (_, exported) => {
      if (exported) exportedConfig = exported;
      return exported ?? promptResponse;
    },
    alert: (message) => alerts.push(message),
  });
  mounted();
  return {
    ...component, api, local, alerts,
    getExport: () => JSON.parse(LZString.decompressFromUTF16(exportedConfig)),
    setImport: (config) => { promptResponse = LZString.compressToUTF16(JSON.stringify(config)); },
  };
}

test("existing settings keep their API key and defaults without requiring obsolete OCR credentials", () => {
  const fixture = settingsFixture({ openAiApiKey: "existing-key", azureApiKey: "old-secret", azureEndpoint: "old-endpoint" });
  assert.equal(fixture.state().isFormOpen, false);
  assert.equal(get(fixture.api.openAiApiKey), "existing-key");
  assert.equal(get(fixture.api.openAiBaseUrl), "https://api.openai.com/v1");
  assert.equal(get(fixture.api.openAiModel), "gpt-4o");
  assert.equal(fixture.local.has("azureApiKey"), false);
  assert.equal(fixture.local.has("azureEndpoint"), false);
});

test("incomplete provider or Azure settings open the settings form", () => {
  assert.equal(settingsFixture().state().isFormOpen, true);
  assert.equal(settingsFixture({ openAiApiKey: "key", openAiModel: "" }).state().isFormOpen, true);
  assert.equal(settingsFixture({ useAzureOpenAI: "true", openAiApiKey: "key" }).state().isFormOpen, true);
  assert.equal(settingsFixture({
    useAzureOpenAI: "true", azureOpenAiEndpoint: "endpoint", azureOpenAiKey: "key",
    azureOpenAiDeployment: "deployment", azureOpenAiVersion: "version",
  }).state().isFormOpen, false);
});

test("custom endpoint and model survive import, save, reload, and export", () => {
  const fixture = settingsFixture();
  fixture.setImport({
    openAiApiKey: " router-key ", openAiBaseUrl: " https://openrouter.ai/api/v1/ ",
    openAiModel: " openai/gpt-4o ", threadOutputsFromOneRequestToTheNext: true,
  });
  fixture.importConfig();
  assert.equal(get(fixture.api.openAiBaseUrl), "https://openrouter.ai/api/v1");
  assert.equal(get(fixture.api.openAiModel), "openai/gpt-4o");
  assert.equal(fixture.local.get("openAiApiKey"), "router-key");
  const reloaded = settingsFixture(Object.fromEntries(fixture.local));
  assert.equal(get(reloaded.api.openAiModel), "openai/gpt-4o");
  assert.equal(get(reloaded.api.threadOutputsFromOneRequestToTheNext), true);
  fixture.exportConfig();
  const exported = fixture.getExport();
  assert.equal(exported.openAiBaseUrl, "https://openrouter.ai/api/v1");
  assert.equal(exported.openAiModel, "openai/gpt-4o");
  assert.equal(exported.openAiApiKey, "router-key");
  assert.equal(exported.azureApiKey, undefined);
});

test("legacy imported configs receive provider defaults, and invalid imports leave settings unchanged", () => {
  const fixture = settingsFixture();
  fixture.setImport({ openAiApiKey: "legacy-key", azureApiKey: "unused" });
  fixture.importConfig();
  assert.equal(get(fixture.api.openAiModel), "gpt-4o");
  for (const config of [null, [], { openAiApiKey: 123 }, { openAiModel: false }, { useAzureOpenAI: "false" }]) {
    fixture.setImport(config);
    fixture.importConfig();
  }
  assert.equal(fixture.alerts.length, 5);
  assert.equal(get(fixture.api.openAiApiKey), "legacy-key");
});
