<script lang="ts">
  import { analyzeImage } from '../lib/AzureOcrService';
  import { correctText } from '../lib/OpenAIGPT4VisionService';
  import { writable } from 'svelte/store';

  const ocrText = writable('');
  const correctedText = writable('');
  let imageFile: File | null = null;

  function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          imageFile = item.getAsFile();
          processImage();
          break;
        }
      }
    }
  }

  // Listen for paste events
  window.addEventListener('paste', handlePaste);

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    imageFile = input.files[0];
  }

  async function processImage() {
    if (!imageFile) {
      console.error('No image file selected');
      return;
    }

    try {
      const extractedText = await analyzeImage(imageFile);
      ocrText.set(extractedText);
      const corrected = await correctText(extractedText, imageFile);
      correctedText.set(corrected);
    } catch (error) {
      console.error('Error processing image:', error);
    }
  }
</script>

<input type="file" id="imageUpload" accept="image/*" on:change={handleFileSelect} />
<button on:click={processImage}>Process Image</button>

<label for="imageUpload">Upload an image</label>

<p>OCR Text:</p>
<textarea readonly>{$ocrText}</textarea>

<p>Corrected Text:</p>
<textarea readonly>{$correctedText}</textarea>

<style>
  /* Add styles for the image upload form here */
</style>
