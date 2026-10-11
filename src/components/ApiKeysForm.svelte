<script lang="ts">
  import { onMount } from "svelte";
  import { saveToLocalStorage, getFromLocalStorage } from "../lib/LocalStorage";
  import {
    openAiApiKey,
    openAiBaseUrl,
    openAiModel,
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    useAzureOpenAI,
    azureOpenAiEndpoint,
    azureOpenAiDeployment,
    azureOpenAiKey,
    azureOpenAiVersion,
    customExtraPrompt,
    threadOutputsFromOneRequestToTheNext,
  } from "../lib/OpenAIGPT4VisionService";
  import * as LZString from "lz-string";

  let l_openAiKey: string = "";
  let l_openAiBaseUrl: string = DEFAULT_BASE_URL;
  let l_openAiModel: string = DEFAULT_MODEL;
  let l_useAzureOpenAIFlag: boolean = false;
  let l_azureOpenAiEndpoint: string = "";
  let l_azureOpenAiDeployment: string = "";
  let l_azureOpenAiKey: string = "";
  let l_azureOpenAiVersion: string = "";
  let l_customExtraPrompt: string = "";
  let l_threadOutputsFromOneRequestToTheNext: boolean = false;

  let isFormOpen = true;

  onMount(() => {
    localStorage.removeItem("azureApiKey");
    localStorage.removeItem("azureEndpoint");
    l_openAiKey = getFromLocalStorage("openAiApiKey") || "";
    l_openAiBaseUrl = getFromLocalStorage("openAiBaseUrl") ?? DEFAULT_BASE_URL;
    l_openAiModel = getFromLocalStorage("openAiModel") ?? DEFAULT_MODEL;
    l_useAzureOpenAIFlag = getFromLocalStorage("useAzureOpenAI") === "true";
    l_azureOpenAiEndpoint = getFromLocalStorage("azureOpenAiEndpoint") || "";
    l_azureOpenAiDeployment =
      getFromLocalStorage("azureOpenAiDeployment") || "";
    l_azureOpenAiKey = getFromLocalStorage("azureOpenAiKey") || "";
    l_azureOpenAiVersion = getFromLocalStorage("azureOpenAiVersion") || "";
    l_customExtraPrompt = getFromLocalStorage("customExtraPrompt") || "";
    l_threadOutputsFromOneRequestToTheNext =
      getFromLocalStorage("threadOutputsFromOneRequestToTheNext") === "true";

    isFormOpen =
      l_useAzureOpenAIFlag
        ? !l_azureOpenAiEndpoint ||
          !l_azureOpenAiDeployment ||
          !l_azureOpenAiKey ||
          !l_azureOpenAiVersion
        : !l_openAiKey || !l_openAiBaseUrl || !l_openAiModel;

    openAiApiKey.set(l_openAiKey);
    openAiBaseUrl.set(l_openAiBaseUrl);
    openAiModel.set(l_openAiModel);
    useAzureOpenAI.set(l_useAzureOpenAIFlag);
    azureOpenAiEndpoint.set(l_azureOpenAiEndpoint);
    azureOpenAiDeployment.set(l_azureOpenAiDeployment);
    azureOpenAiKey.set(l_azureOpenAiKey);
    azureOpenAiVersion.set(l_azureOpenAiVersion);
    customExtraPrompt.set(l_customExtraPrompt);
    threadOutputsFromOneRequestToTheNext.set(
      l_threadOutputsFromOneRequestToTheNext,
    );
  });

  function saveApiKeys() {
    l_openAiKey = l_openAiKey.trim();
    l_openAiBaseUrl = l_openAiBaseUrl.trim().replace(/\/+$/, "");
    l_openAiModel = l_openAiModel.trim();
    saveToLocalStorage("openAiApiKey", l_openAiKey);
    saveToLocalStorage("openAiBaseUrl", l_openAiBaseUrl);
    saveToLocalStorage("openAiModel", l_openAiModel);
    saveToLocalStorage("useAzureOpenAI", l_useAzureOpenAIFlag.toString());
    saveToLocalStorage("azureOpenAiEndpoint", l_azureOpenAiEndpoint);
    saveToLocalStorage("azureOpenAiDeployment", l_azureOpenAiDeployment);
    saveToLocalStorage("azureOpenAiKey", l_azureOpenAiKey);
    saveToLocalStorage("azureOpenAiVersion", l_azureOpenAiVersion);
    saveToLocalStorage("customExtraPrompt", l_customExtraPrompt);
    saveToLocalStorage(
      "threadOutputsFromOneRequestToTheNext",
      l_threadOutputsFromOneRequestToTheNext.toString(),
    );

    openAiApiKey.set(l_openAiKey);
    openAiBaseUrl.set(l_openAiBaseUrl);
    openAiModel.set(l_openAiModel);
    useAzureOpenAI.set(l_useAzureOpenAIFlag);
    azureOpenAiEndpoint.set(l_azureOpenAiEndpoint);
    azureOpenAiDeployment.set(l_azureOpenAiDeployment);
    azureOpenAiKey.set(l_azureOpenAiKey);
    azureOpenAiVersion.set(l_azureOpenAiVersion);
    customExtraPrompt.set(l_customExtraPrompt);
    threadOutputsFromOneRequestToTheNext.set(
      l_threadOutputsFromOneRequestToTheNext,
    );
  }

  function exportConfig() {
    const config = {
      openAiApiKey: l_openAiKey,
      openAiBaseUrl: l_openAiBaseUrl,
      openAiModel: l_openAiModel,
      useAzureOpenAI: l_useAzureOpenAIFlag,
      azureOpenAiEndpoint: l_azureOpenAiEndpoint,
      azureOpenAiDeployment: l_azureOpenAiDeployment,
      azureOpenAiKey: l_azureOpenAiKey,
      azureOpenAiVersion: l_azureOpenAiVersion,
      customExtraPrompt: l_customExtraPrompt,
      threadOutputsFromOneRequestToTheNext:
        l_threadOutputsFromOneRequestToTheNext,
    };
    const configStr = JSON.stringify(config);
    const compressedConfigStr = LZString.compressToUTF16(configStr);
    prompt("Here is your configuration. It contains API keys: keep it private.", compressedConfigStr);
  }

  function importConfig() {
    const compressedConfigStr = prompt("Please paste your configuration here:");
    if (compressedConfigStr) {
      try {
        const configStr = LZString.decompressFromUTF16(compressedConfigStr);
        const config = JSON.parse(configStr);
        if (!config || typeof config !== "object" || Array.isArray(config)) {
          throw new Error("Configuration must be an object.");
        }
        for (const key of ["openAiApiKey", "openAiBaseUrl", "openAiModel", "azureOpenAiEndpoint", "azureOpenAiDeployment", "azureOpenAiKey", "azureOpenAiVersion", "customExtraPrompt"]) {
          if (key in config && typeof config[key] !== "string") throw new Error(`${key} must be text.`);
        }
        for (const key of ["useAzureOpenAI", "threadOutputsFromOneRequestToTheNext"]) {
          if (key in config && typeof config[key] !== "boolean") throw new Error(`${key} must be true or false.`);
        }
        l_openAiKey = config.openAiApiKey || "";
        l_openAiBaseUrl = config.openAiBaseUrl ?? DEFAULT_BASE_URL;
        l_openAiModel = config.openAiModel ?? DEFAULT_MODEL;
        l_useAzureOpenAIFlag = config.useAzureOpenAI || false;
        l_azureOpenAiEndpoint = config.azureOpenAiEndpoint || "";
        l_azureOpenAiDeployment = config.azureOpenAiDeployment || "";
        l_azureOpenAiKey = config.azureOpenAiKey || "";
        l_azureOpenAiVersion = config.azureOpenAiVersion || "";
        l_customExtraPrompt = config.customExtraPrompt || "";
        l_threadOutputsFromOneRequestToTheNext =
          config.threadOutputsFromOneRequestToTheNext || false;

        saveApiKeys();
      } catch (error: unknown) {
        alert("Failed to import configuration: " + (error instanceof Error ? error.message : "Invalid configuration."));
      }
    }
  }
</script>

<div>
  <hr />
  <div class="row config-botton-row">
    <div class="col">
      <button on:click={() => (isFormOpen = !isFormOpen)}
        >{#if isFormOpen}Close{:else}Open{/if} Settings
      </button>
    </div>
    {#if isFormOpen}
      <div class="col">
        <p style="text-align: right;">
          <small>
            Note: Settings are saved automatically and persist across reloads.
            API keys are stored unencrypted in this browser. Images and any threaded
            text are sent directly to your selected provider.
          </small>
        </p>
      </div>
    {/if}
  </div>
  {#if isFormOpen}
    <form on:submit|preventDefault={saveApiKeys}>
      <div class="row">
        <div class="col" style="text-align: right;">
          <div class="row">
            <div class="col">
              <label for="useAzureOpenAI">Use Azure OpenAI Service:</label>
              <input
                id="useAzureOpenAI"
                type="checkbox"
                bind:checked={l_useAzureOpenAIFlag}
                on:change={saveApiKeys}
              />
            </div>
          </div>
          <div class="row">
            <div class="col">
              <label for="threadOutputsFromOneRequestToTheNext"
                >Process sequentially, using previous images' text as context:</label
              >
              <input
                id="threadOutputsFromOneRequestToTheNext"
                type="checkbox"
                bind:checked={l_threadOutputsFromOneRequestToTheNext}
                on:change={saveApiKeys}
              />
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col">
          {#if l_useAzureOpenAIFlag}
            <div class="row">
              <div class="col">
                <label for="azureOpenAiEndpoint"
                  >Azure OpenAI Endpoint URL:</label
                >
                <input
                  id="azureOpenAiEndpoint"
                  type="text"
                  bind:value={l_azureOpenAiEndpoint}
                  on:change={saveApiKeys}
                />
              </div>
            </div>
            <div class="row">
              <div class="col">
                <label for="azureOpenAiDeployment"
                  >Azure OpenAI Model Deployment Name:</label
                >
                <input
                  id="azureOpenAiDeployment"
                  type="text"
                  bind:value={l_azureOpenAiDeployment}
                  on:change={saveApiKeys}
                />
              </div>
            </div>
            <div class="row">
              <div class="col">
                <label for="azureOpenAiVersion">Azure OpenAI Version:</label>
                <input
                  id="azureOpenAiVersion"
                  type="text"
                  bind:value={l_azureOpenAiVersion}
                  on:change={saveApiKeys}
                />
              </div>
            </div>
            <div class="row">
              <div class="col">
                <label for="azureOpenAiKey">Azure OpenAI Key:</label>
                <input
                  id="azureOpenAiKey"
                  type="password"
                  bind:value={l_azureOpenAiKey}
                  on:change={saveApiKeys}
                />
              </div>
            </div>
          {:else}
            <div class="row">
              <label for="openAiKey">Provider API Key:</label>
              <input
                id="openAiKey"
                type="password"
                bind:value={l_openAiKey}
                on:change={saveApiKeys}
              />
            </div>
            <div class="row">
              <label for="openAiBaseUrl">OpenAI-compatible API Base URL:</label>
              <input
                id="openAiBaseUrl"
                type="url"
                placeholder={DEFAULT_BASE_URL}
                bind:value={l_openAiBaseUrl}
                on:change={saveApiKeys}
              />
              <small>
                OpenAI: https://api.openai.com/v1.
                OpenRouter: https://openrouter.ai/api/v1.
                Do not include /chat/completions. Custom endpoints must allow
                browser requests (CORS); an HTTPS app requires an HTTPS endpoint.
              </small>
            </div>
            <div class="row">
              <label for="openAiModel">Vision Model ID:</label>
              <input
                id="openAiModel"
                type="text"
                placeholder={DEFAULT_MODEL}
                bind:value={l_openAiModel}
                on:change={saveApiKeys}
              />
              <small>
                Must support images. OpenRouter uses prefixed IDs such as
                openai/gpt-4o. A ChatGPT subscription does not include API credits.
              </small>
            </div>
          {/if}
        </div>
      </div>

      <div class="row">
        <div class="col">
          <label for="customExtraPrompt">Extra prompt for model:</label>
          <textarea
            id="customExtraPrompt"
            bind:value={l_customExtraPrompt}
            on:change={saveApiKeys}
          ></textarea>
        </div>
      </div>

      <div class="row">
        <div class="col config-button-holder" style="text-align: center;">
          <button type="button" on:click={exportConfig}>Export Config</button>
          <button type="button" on:click={importConfig}>Import Config</button>
        </div>
      </div>
    </form>
  {/if}
  <hr />
</div>

<style>
  .config-button-holder button {
    margin-top: 0.5em;
  }

  .config-botton-row .col {
    margin-bottom: 0;
  }
</style>
