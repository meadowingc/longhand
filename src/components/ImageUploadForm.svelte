<script lang="ts">
  import { analyzeImage } from "../lib/AzureOcrService";
  import { correctText } from "../lib/OpenAIGPT4VisionService";
  import { writable } from "svelte/store";
  import { toastMessage } from "../lib/toastService";

  const ocrText = writable("");
  const correctedText = writable("");

  let imageUrl = "";
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
    }
  }

  async function processImage() {
    if (!imageFile) {
      toastMessage.set("No image file selected");
      return;
    }

    try {
      const extractedText = await analyzeImage(imageFile);
      ocrText.set(extractedText);
      const corrected = await correctText(extractedText, imageFile);
      correctedText.set(corrected);
    } catch (error) {
      console.error("Error processing image:", error);
    }
  }
</script>

<div style="margin-top: 2em;">
  <label for="imageUpload">Upload (or paste) an image</label>
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
      <button style="width: 100%;" on:click={processImage}>Process Image</button
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

  <div class="row">
    <div class="col">
      <div>OCR Text:</div>
      <textarea readonly>{$ocrText}</textarea>
    </div>
  </div>
  <div class="row">
    <div class="col">
      <div>Corrected Text:</div>
      <textarea readonly>{$correctedText}</textarea>
    </div>
  </div>
</div>

<style>
</style>
