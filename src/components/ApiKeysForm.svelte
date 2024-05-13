<script lang="ts">
  import { saveToLocalStorage, getFromLocalStorage } from '../lib/LocalStorage';
  import { azureApiKey, azureEndpoint } from '../lib/AzureOcrService';
  import { openAiApiKey } from '../lib/OpenAIGPT4VisionService';

  let azureKey: string = getFromLocalStorage('azureApiKey') || '';
  let azureUrl: string = getFromLocalStorage('azureEndpoint') || '';
  let openAiKey: string = getFromLocalStorage('openAiApiKey') || '';

  function saveApiKeys() {
    saveToLocalStorage('azureApiKey', azureKey);
    saveToLocalStorage('azureEndpoint', azureUrl);
    saveToLocalStorage('openAiApiKey', openAiKey);
    azureApiKey.set(azureKey);
    azureEndpoint.set(azureUrl);
    openAiApiKey.set(openAiKey);
  }
</script>

<form on:submit|preventDefault={saveApiKeys}>
  <label for="azureKey">Azure API Key:</label>
  <input id="azureKey" type="text" bind:value={azureKey} />

  <label for="azureUrl">Azure Endpoint URL:</label>
  <input id="azureUrl" type="text" bind:value={azureUrl} />

  <label for="openAiKey">OpenAI API Key:</label>
  <input id="openAiKey" type="text" bind:value={openAiKey} />

  <button type="submit">Save API Keys</button>
</form>

<style>
  /* Add styles for the API keys form here */
</style>
