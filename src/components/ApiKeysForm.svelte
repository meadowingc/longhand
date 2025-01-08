<script lang="ts">
  import { onMount } from "svelte";
  import { saveToLocalStorage, getFromLocalStorage } from "../lib/LocalStorage";
  import { azureApiKey, azureEndpoint } from "../lib/AzureOcrService";
  import {
    openAiApiKey,
    useAzureOpenAI,
    azureOpenAiEndpoint,
    azureOpenAiDeployment,
    azureOpenAiKey,
    azureOpenAiVersion,
    customExtraPrompt,
    threadOutputsFromOneRequestToTheNext,
  } from "../lib/OpenAIGPT4VisionService";
  import * as LZString from "lz-string";

  let l_azureKey: string = "";
  let l_azureUrl: string = "";
  let l_openAiKey: string = "";
  let l_useAzureOpenAIFlag: boolean = false;
  let l_azureOpenAiEndpoint: string = "";
  let l_azureOpenAiDeployment: string = "";
  let l_azureOpenAiKey: string = "";
  let l_azureOpenAiVersion: string = "";
  let l_customExtraPrompt: string = "";
  let l_threadOutputsFromOneRequestToTheNext: boolean = false;

  let isFormOpen = true;

  onMount(() => {
    l_azureKey = getFromLocalStorage("azureApiKey") || "";
    l_azureUrl = getFromLocalStorage("azureEndpoint") || "";
    l_openAiKey = getFromLocalStorage("openAiApiKey") || "";
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
      !l_azureKey || !l_azureUrl || l_useAzureOpenAIFlag
        ? !l_azureOpenAiEndpoint ||
          !l_azureOpenAiDeployment ||
          !l_azureOpenAiKey ||
          !l_azureOpenAiVersion
        : !l_openAiKey;

    azureApiKey.set(l_azureKey);
    azureEndpoint.set(l_azureUrl);
    openAiApiKey.set(l_openAiKey);
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
    saveToLocalStorage("azureApiKey", l_azureKey);
    saveToLocalStorage("azureEndpoint", l_azureUrl);
    saveToLocalStorage("openAiApiKey", l_openAiKey);
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

    azureApiKey.set(l_azureKey);
    azureEndpoint.set(l_azureUrl);
    openAiApiKey.set(l_openAiKey);
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
      azureApiKey: l_azureKey,
      azureEndpoint: l_azureUrl,
      openAiApiKey: l_openAiKey,
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
    prompt("Here is your configuration:", compressedConfigStr);
  }

  function importConfig() {
    const compressedConfigStr = prompt("Please paste your configuration here:");
    if (compressedConfigStr) {
      try {
        const configStr = LZString.decompressFromUTF16(compressedConfigStr);
        const config = JSON.parse(configStr);
        l_azureKey = config.azureApiKey || "";
        l_azureUrl = config.azureEndpoint || "";
        l_openAiKey = config.openAiApiKey || "";
        l_useAzureOpenAIFlag = config.useAzureOpenAI || false;
        l_azureOpenAiEndpoint = config.azureOpenAiEndpoint || "";
        l_azureOpenAiDeployment = config.azureOpenAiDeployment || "";
        l_azureOpenAiKey = config.azureOpenAiKey || "";
        l_azureOpenAiVersion = config.azureOpenAiVersion || "";
        l_customExtraPrompt = config.customExtraPrompt || "";
        l_threadOutputsFromOneRequestToTheNext =
          config.threadOutputsFromOneRequestToTheNext || false;

        saveApiKeys();
      } catch (e: any) {
        alert("Failed to import configuration: " + e.message);
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
                >Thread outputs from one request to the next:</label
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
          <label for="azureUrl">Azure Computer Vision Endpoint URL:</label>
          <input
            id="azureUrl"
            type="text"
            bind:value={l_azureUrl}
            on:change={saveApiKeys}
          />
        </div>
        <div class="col">
          <label for="azureKey">Azure Computer Vision API Key:</label>
          <input
            id="azureKey"
            type="text"
            bind:value={l_azureKey}
            on:change={saveApiKeys}
          />
        </div>

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
                <label for="azureOpenAiKey">Azure OpenAI Version:</label>
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
                  type="text"
                  bind:value={l_azureOpenAiKey}
                  on:change={saveApiKeys}
                />
              </div>
            </div>
          {:else}
            <div class="row">
              <label for="openAiKey">OpenAI API Key:</label>
              <input
                id="openAiKey"
                type="text"
                bind:value={l_openAiKey}
                on:change={saveApiKeys}
              />
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
