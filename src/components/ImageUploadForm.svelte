<script lang="ts">
  import { analyzeImage } from "../lib/AzureOcrService";
  import { correctText } from "../lib/OpenAIGPT4VisionService";
  import { writable } from "svelte/store";
  import { toastMessage } from "../lib/toastService";

  const ocrText = writable("");
  const correctedText = writable("");
  let isLoading = false;

  let imageUrl = "";
  let isGptStreaming = false;
  let imageFile: File | null = null;

  function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.indexOf("image") === 0) {
          imageFile = item.getAsFile();
          break;
        }
      }
      if (imageFile) {
        imageUrl = URL.createObjectURL(imageFile);
        ocrText.set("");
        correctedText.set("");
      }
    }
  }

  // Listen for paste events
  window.addEventListener("paste", handlePaste);

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    imageFile = input.files[0];
    if (imageFile) {
      imageUrl = URL.createObjectURL(imageFile);
      ocrText.set("");
      correctedText.set("");
    }
  }

  async function processImage() {
    if (!imageFile) {
      toastMessage.set("No image file selected");
      return;
    }

    isLoading = true;

    try {
      const extractedText = await analyzeImage(imageFile);
      ocrText.set(extractedText);

      isGptStreaming = true;
      await correctText(
        extractedText,
        imageFile,
        (currentText: string, finished: boolean) => {
          correctedText.set(currentText);
          if (finished) {
            isGptStreaming = false;
          }
        }
      );
    } catch (error) {
      console.error("Error processing image:", error);
    } finally {
      isLoading = false;
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        toastMessage.set("Text copied to clipboard");
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  }
</script>

<div style="margin-top: 2em;">
  <label for="imageUpload">Upload (or paste with Ctrl+V) an image</label>
  <div class="row">
    <div class="col-9">
      <input
        type="file"
        id="imageUpload"
        accept="image/*"
        on:change={handleFileSelect}
      />
    </div>
    <div class="col-3">
      <button
        type="button"
        class="button primary"
        style="width: 100%;"
        on:click={processImage}>Process Image</button
      >
    </div>
  </div>

  {#if imageUrl}
    <div class="row">
      <div class="col" style="text-align: center;">
        <!-- svelte-ignore a11y-img-redundant-alt -->
        <img
          src={imageUrl}
          alt="Selected image"
          style="max-width: 100%; max-height: 20vh;"
        />
      </div>
    </div>
  {/if}

  <!-- We only care about OCR output when working locally -->
  {#if process.env.NODE_ENV !== "production"}
    <div class="row">
      <div class="col">
        <div>OCR text:</div>
        <div class="card output-holder ocr-text">
          {#if !isLoading || $ocrText !== ""}
            {$ocrText}
          {/if}
          {#if isLoading && $ocrText === ""}
            Loading OCR text...
          {/if}
        </div>
      </div>
    </div>
  {/if}
  <div class="row">
    <div class="col">
      <div>Extracted text:</div>
      {#if isGptStreaming}
        <div><small>Loading ...</small></div>
      {/if}
      <div class="card output-holder">
        {#if isLoading}
          {#if $ocrText === "" && $correctedText === ""}
            Waiting for OCR text...
          {:else if $ocrText !== "" && $correctedText === ""}
            Loading corrected text...
          {/if}
        {:else if $correctedText !== ""}
          <button
            on:click={() => copyToClipboard($correctedText)}
            class="copy-button"
          >
            Copy to clipboard
          </button>
          <pre>
{$correctedText}
</pre>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .output-holder {
    min-height: 4em;
  }

  .output-holder pre {
    max-height: 600px;
    overflow-y: auto;
    white-space: pre-wrap;
  }

  .copy-button {
    font-size: 1em;
    padding: 0.3em 0.5em;
  }

  .ocr-text {
    max-height: 10em;
    overflow-y: scroll;
  }
</style>
