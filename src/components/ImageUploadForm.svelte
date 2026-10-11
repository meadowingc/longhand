<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    transcribeImage,
    formatModelError,
    threadOutputsFromOneRequestToTheNext,
  } from "../lib/OpenAIGPT4VisionService";
  import { toastMessage } from "../lib/toastService";
  import { get } from "svelte/store";

  class SessionImage {
    constructor(
      public imageUrl: string,
      public imageFile: File,
      public isLoading: boolean = false,
      public isStreaming: boolean = false,
      public correctedText: string = "",
      public error: string = "",
    ) {}
  }

  let sessionImages: SessionImage[] = [];
  let isProcessing = false;

  function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (items) {
      let imageFile = undefined;
      for (const item of items) {
        if (item.type.indexOf("image") === 0) {
          imageFile = item.getAsFile();
          break;
        }
      }
      if (imageFile) {
        sessionImages = [
          ...sessionImages,
          new SessionImage(
            URL.createObjectURL(imageFile),
            imageFile,
            false,
            false,
          ),
        ];
      }
    }
  }

  window.addEventListener("paste", handlePaste);
  onDestroy(() => {
    window.removeEventListener("paste", handlePaste);
    sessionImages.forEach((image) => URL.revokeObjectURL(image.imageUrl));
  });

  function removeImage(index: number) {
    URL.revokeObjectURL(sessionImages[index].imageUrl);
    sessionImages = sessionImages.filter((_, i) => i !== index);
  }

  function clearSession() {
    sessionImages.forEach((image) => URL.revokeObjectURL(image.imageUrl));
    sessionImages = [];
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const newImages = Array.from(input.files).map(
      (file) => new SessionImage(URL.createObjectURL(file), file, false, false),
    );
    sessionImages = [...sessionImages, ...newImages];
  }

  async function processImages() {
    if (isProcessing) return;
    if (sessionImages.length === 0) {
      toastMessage.set("No image file selected");
      return;
    }

    isProcessing = true;
    const images = [...sessionImages];
    try {
      if (get(threadOutputsFromOneRequestToTheNext)) {
        const previousTexts: string[] = [];
        for (const image of images) {
          const text = await processImage(image, previousTexts);
          if (text !== undefined) previousTexts.push(text);
          else {
            toastMessage.set(`${image.error} Sequential processing stopped; remaining images were not sent.`);
            break;
          }
        }
      } else {
        await Promise.all(images.map((image) => processImage(image, [])));
      }
    } finally {
      isProcessing = false;
    }
  }

  async function processImage(image: SessionImage, previousTexts: string[]) {
    image.isLoading = true;
    image.isStreaming = true;
    image.correctedText = "";
    image.error = "";
    sessionImages = [...sessionImages];
    try {
      return await transcribeImage(
        image.imageFile,
        previousTexts,
        (currentText: string) => {
          image.correctedText = currentText;
          sessionImages = [...sessionImages];
        },
      );
    } catch (error) {
      console.error("Error processing image:", error);
      image.error = formatModelError(error);
      toastMessage.set(image.error);
    } finally {
      image.isLoading = false;
      image.isStreaming = false;
      sessionImages = [...sessionImages];
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        toastMessage.set("Text copied to clipboard");
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toastMessage.set("Could not copy text. Select and copy the displayed text manually.");
      },
    );
  }
</script>

<div style="margin-top: 2em;">
  <label for="imageUpload">Upload or paste images to transcribe</label>
  <div class="row">
    <div class="col-9">
      <input
        type="file"
        id="imageUpload"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        on:change={handleFileSelect}
      />
    </div>
    <div class="col-3">
      <div class="row">
        <button
          type="button"
          class="button primary"
          disabled={isProcessing}
          style="width: 100%;"
          on:click={processImages}>{isProcessing ? "Processing..." : "Process Images"}</button
        >
      </div>
      <div class="row" style="margin-top: 0.5em;">
        <button
          type="button"
          class="button"
          disabled={isProcessing}
          style="width: 100%;"
          on:click={clearSession}>Clear Session</button
        >
      </div>
    </div>
  </div>

  {#each sessionImages as sessionImg, index (sessionImg)}
    <div class="row">
      <div class="col" style="text-align: left;">
        <hr />
        <h1>
          Image {index + 1}
          <span style="text-align: right;">
            <button
              type="button"
              class="button"
              disabled={isProcessing}
              on:click={() => removeImage(index)}>Remove</button
            >
          </span>
        </h1>
      </div>
    </div>

    <div class="row">
      <div class="col" style="text-align: center;">
        <!-- svelte-ignore a11y-img-redundant-alt -->
        <img
          src={sessionImg.imageUrl}
          alt="Selected image"
          style="max-width: 100%; max-height: 20vh;"
        />
      </div>
    </div>

    <div class="row">
      <div class="col">
        <div>Extracted text:</div>
        {#if sessionImg.isStreaming}
          <div><small>Loading ...</small></div>
        {/if}
        <div class="card output-holder">
          {#if sessionImg.error}
            <p role="alert">{sessionImg.error}</p>
            {#if sessionImg.correctedText}
              <small>Partial output; transcription did not complete.</small>
            {/if}
          {/if}
          {#if sessionImg.isLoading && !sessionImg.correctedText}
            Transcribing image...
          {/if}
          {#if sessionImg.correctedText !== ""}
            {#if !sessionImg.isLoading}
              <button
                on:click={() => copyToClipboard(sessionImg.correctedText)}
                class="copy-button"
              >
                Copy to clipboard
              </button>
            {/if}
            <pre>
{sessionImg.correctedText}
</pre>
          {/if}
        </div>
      </div>
    </div>
  {/each}
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
</style>
