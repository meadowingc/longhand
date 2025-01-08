<script lang="ts">
  import { analyzeImage } from "../lib/AzureOcrService";
  import {
    correctText,
    threadOutputsFromOneRequestToTheNext,
  } from "../lib/OpenAIGPT4VisionService";
  import { writable } from "svelte/store";
  import { toastMessage } from "../lib/toastService";
  import { get } from "svelte/store";

  class SessionImage {
    constructor(
      public imageUrl: string,
      public imageFile: File,
      public isLoading: boolean = false,
      public isStreaming: boolean = false,
      public ocrText: string = "",
      public correctedText: string = "",
    ) {}
  }

  let sessionImages: SessionImage[] = [];

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

  // Listen for paste events
  window.addEventListener("paste", handlePaste);

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
    if (sessionImages.length == 0) {
      toastMessage.set("No image file selected");
      return;
    }

    await new Promise<void>(async (resolve) => {
      for (const sessionImg of sessionImages) {
        sessionImg.isLoading = true;
        const extractedText = await analyzeImage(sessionImg.imageFile);
        sessionImg.ocrText = extractedText;
        sessionImages = [...sessionImages];
      }

      resolve();
    });

    if (get(threadOutputsFromOneRequestToTheNext)) {
      // do one at a time and pass the output of one to the next so that GPT has more context when correcting
      // this is useful when the images are related or build
      const previousCorrectedTexts: string[] = [];
      for (const sessionImg of sessionImages) {
        try {
          sessionImg.isStreaming = true;
          sessionImages = [...sessionImages];

          await new Promise<void>((resolve) => {
            correctText(
              sessionImg.ocrText,
              sessionImg.imageFile,
              previousCorrectedTexts,
              (currentText: string, finished: boolean) => {
                sessionImg.correctedText = currentText;
                sessionImages = [...sessionImages];

                if (finished) {
                  sessionImg.isStreaming = false;
                  previousCorrectedTexts.push(currentText);
                  sessionImages = [...sessionImages];

                  resolve();
                }
              },
            );
          });

          sessionImages = [...sessionImages];
        } catch (error) {
          console.error("Error processing image:", error);
        } finally {
          sessionImg.isLoading = false;
          sessionImages = [...sessionImages];
        }
      }
    } else {
      // just process everything in parallel
      sessionImages.forEach(async (sessionImg) => {
        if (sessionImg.isLoading) {
          // skip if we're already loading
          return;
        }

        try {
          sessionImg.isStreaming = true;
          sessionImages = [...sessionImages];

          await correctText(
            sessionImg.ocrText,
            sessionImg.imageFile,
            [],
            (currentText: string, finished: boolean) => {
              sessionImg.correctedText = currentText;
              sessionImages = [...sessionImages];

              if (finished) {
                sessionImg.isStreaming = false;
                sessionImages = [...sessionImages];
              }
            },
          );
        } catch (error) {
          console.error("Error processing image:", error);
        } finally {
          sessionImg.isLoading = false;
          sessionImages = [...sessionImages];
        }
      });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        toastMessage.set("Text copied to clipboard");
      },
      (err) => {
        console.error("Could not copy text: ", err);
      },
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
        multiple
        on:change={handleFileSelect}
      />
    </div>
    <div class="col-3">
      <div class="row">
        <button
          type="button"
          class="button primary"
          style="width: 100%;"
          on:click={processImages}>Process Images</button
        >
      </div>
      <div class="row" style="margin-top: 0.5em;">
        <button
          type="button"
          class="button"
          style="width: 100%;"
          on:click={() => {
            sessionImages = [];
          }}>Clear Session</button
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
              on:click={() => {
                sessionImages = sessionImages.filter((_, i) => i !== index);
              }}>Remove</button
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

    <!-- We only care about OCR output when working locally -->
    {#if process.env.NODE_ENV !== "production"}
      <div class="row">
        <div class="col">
          <div>OCR text:</div>
          <div class="card output-holder ocr-text">
            {#if !sessionImg.isLoading || sessionImg.ocrText !== ""}
              {sessionImg.ocrText}
            {/if}
            {#if sessionImg.isLoading && sessionImg.ocrText === ""}
              Loading OCR text...
            {/if}
          </div>
        </div>
      </div>
    {/if}
    <div class="row">
      <div class="col">
        <div>Extracted text:</div>
        {#if sessionImg.isStreaming}
          <div><small>Loading ...</small></div>
        {/if}
        <div class="card output-holder">
          {#if sessionImg.isLoading}
            {#if sessionImg.ocrText === "" && sessionImg.correctedText === ""}
              Waiting for OCR text...
            {:else if sessionImg.ocrText !== "" && sessionImg.correctedText === ""}
              Loading corrected text...
            {/if}
          {:else if sessionImg.correctedText !== ""}
            <button
              on:click={() => copyToClipboard(sessionImg.correctedText)}
              class="copy-button"
            >
              Copy to clipboard
            </button>
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

  .ocr-text {
    max-height: 10em;
    overflow-y: scroll;
  }
</style>
