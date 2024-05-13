import { writable, get } from "svelte/store";
import { toastMessage } from "./toastService";

const openAiApiKey = writable<string>("");

async function correctText(ocrText: string, image: Blob): Promise<string> {
  const apiKey = get(openAiApiKey);
  if (!apiKey) {
    toastMessage.set("OpenAI API key is not set.");
    return Promise.reject("OpenAI API key is not set.");
  }

  // Placeholder for OpenAI GPT-4 Vision API call
  // Replace with actual API call and parameters
  const formData = new FormData();
  formData.append('prompt', ocrText);
  formData.append('image', image);

  const response = await fetch(
    "https://api.openai.com/v1/engines/gpt-4-vision/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorMessage = `OpenAI GPT-4 Vision API call failed: ${response.statusText}`;
    toastMessage.set(errorMessage);
    return Promise.reject(errorMessage);
  }

  const data = await response.json();
  // Assuming the response contains a field 'choices' with the corrected text
  return data.choices[0].text;
}

export { openAiApiKey, correctText };
