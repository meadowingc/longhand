import OpenAI, { AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam, ChatCompletionChunk } from "openai/resources/index.mjs";
import type { Stream } from "openai/streaming.mjs";
import { get, writable } from "svelte/store";

const openAiApiKey = writable<string>("");
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";
const openAiBaseUrl = writable<string>(DEFAULT_BASE_URL);
const openAiModel = writable<string>(DEFAULT_MODEL);

const threadOutputsFromOneRequestToTheNext = writable<boolean>(false);
const useAzureOpenAI = writable<boolean>(false);
const azureOpenAiEndpoint = writable<string>("");
const azureOpenAiDeployment = writable<string>("");
const azureOpenAiKey = writable<string>("");
const azureOpenAiVersion = writable<string>("");
const customExtraPrompt = writable<string>("");

async function transcribeImage(
  image: Blob,
  previousTexts: string[],
  onStreamTokenCallback: (currentText: string, finished: boolean) => void
) {
  const client = get(useAzureOpenAI)
    ? createAzureClient()
    : createCompatibleClient();
  const model = get(useAzureOpenAI)
    ? get(azureOpenAiDeployment).trim()
    : get(openAiModel).trim();
  const imageDataUrl = await blobToDataUrl(image);

  let systemPrompt = `
Transcribe the handwritten text directly from the provided image.
Output only the transcription, without comments or additional information.
Preserve the author's original wording, spelling, grammar, and style.
Represent visible formatting as clean, readable markdown: paragraph breaks, headings, lists, and quotes.
`;

  if (previousTexts.length > 0) {
    systemPrompt += `
The image you've been provided is part of a sequence of images. This is the text extracted from the previous images in the sequence:

\`\`\`
${previousTexts.join("\n\n")}
\`\`\`

Use previous text only as context. Output only text from the current image; do not repeat previous images.
`;
  }

  if (get(customExtraPrompt).trim() !== "") {
    systemPrompt += `
The user has provided the following additional instructions:

\`\`\`
${get(customExtraPrompt)}
\`\`\`
`;
  }
  const messages: Array<ChatCompletionMessageParam> = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Transcribe the handwritten text in this image.",
        },
        {
          type: "image_url",
          image_url: {
            url: imageDataUrl,
          },
        },
      ],
    },
  ];

  const responseStream: Stream<ChatCompletionChunk> = await client.chat.completions.create({
    model,
    messages,
    stream: true,
  });

  let responseText = "";
  let finishReason = "";
  let refusal = "";
  for await (const chunk of responseStream) {
    const choice = chunk.choices[0];
    if (!choice) continue;
    if (choice.finish_reason) finishReason = choice.finish_reason;
    refusal += choice.delta?.refusal ?? "";
    responseText += choice.delta?.content ?? "";
    if (responseText.trim()) onStreamTokenCallback(responseText, false);
  }

  if (finishReason === "content_filter" || refusal) {
    throw new Error("The model declined to transcribe this image. Check your provider's content policy.");
  }
  if (finishReason === "length") {
    throw new Error("The model's output limit was reached. The displayed text is incomplete; try a smaller image section or a model with a larger output limit.");
  }
  if (!finishReason) throw new Error("The response stream ended unexpectedly. Any displayed text may be incomplete; try again.");
  if (!responseText.trim()) throw new Error("The model returned no transcription. Check that your model supports image input.");
  onStreamTokenCallback(responseText.trim(), true);
  return responseText.trim();
}

function createAzureClient() {
  if (![get(azureOpenAiEndpoint), get(azureOpenAiKey), get(azureOpenAiDeployment), get(azureOpenAiVersion)].every((value) => value.trim())) {
    throw new Error("Set the Azure OpenAI endpoint, deployment, API key, and API version in Settings.");
  }
  return new AzureOpenAI({
    endpoint: validateBaseUrl(get(azureOpenAiEndpoint)),
    apiKey: get(azureOpenAiKey).trim(),
    apiVersion: get(azureOpenAiVersion).trim(),
    deployment: get(azureOpenAiDeployment).trim(),
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
  });
}

function createCompatibleClient() {
  if (!get(openAiApiKey).trim()) throw new Error("Set your provider's API key in Settings.");
  if (!get(openAiModel).trim()) throw new Error("Set a vision-capable model ID in Settings.");
  return new OpenAI({
    apiKey: get(openAiApiKey).trim(),
    baseURL: validateBaseUrl(get(openAiBaseUrl)),
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
  });
}

export function validateBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Set a valid API base URL in Settings, for example https://api.openai.com/v1.");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("API base URL must use HTTP or HTTPS without credentials, query parameters, or fragments.");
  }
  if (/\/chat\/completions\/?$/.test(url.pathname)) {
    throw new Error("Use the API base URL, not the full /chat/completions URL.");
  }
  return url.toString().replace(/\/+$/, "");
}

export function formatModelError(error: unknown): string {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return "The model provider timed out. Try a smaller image or a faster vision model.";
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return "Could not connect to the provider. Check the API base URL, your network, and whether the endpoint allows browser requests (CORS). HTTPS pages cannot use an HTTP endpoint.";
  }
  if (error instanceof OpenAI.APIError) {
    const code = `${error.code ?? ""} ${error.type ?? ""}`;
    if (error.status === 402 || /insufficient_quota|insufficient_credits|billing_hard_limit_reached/.test(code) || /insufficient.*(credit|balance|quota)|exceeded.*quota/i.test(error.message)) {
      return "Not enough API credits or quota. Check your provider's billing and usage limits. A ChatGPT subscription does not include OpenAI API credits.";
    }
    if (error.status === 401) return "Authentication failed. Use an API key from the provider at the configured base URL.";
    if (error.status === 429) return "The provider's rate limit was reached. Wait a moment and try again, or enable sequential processing in Settings.";
    if (error.status === 404) return "Endpoint or model not found. Check the API base URL and the provider's exact vision-model ID.";
    return `Model request failed${error.status ? ` (HTTP ${error.status})` : ""}: ${error.message.slice(0, 300)}`;
  }
  return error instanceof Error ? error.message : "Model request failed. See the browser console for details.";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(blob.type)) {
    return Promise.reject(new Error("Unsupported image format. Export the image as JPEG, PNG, WEBP, or GIF before uploading (including HEIC photos)."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image. Try uploading it again."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the image as a data URL."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

export {
  azureOpenAiDeployment,
  azureOpenAiEndpoint,
  azureOpenAiKey,
  azureOpenAiVersion,
  transcribeImage,
  openAiApiKey,
  openAiBaseUrl,
  openAiModel,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  useAzureOpenAI,
  customExtraPrompt,
  threadOutputsFromOneRequestToTheNext,
};
