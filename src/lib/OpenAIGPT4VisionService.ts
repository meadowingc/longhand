import { writable, get } from "svelte/store";
import { toastMessage } from "./toastService";

const openAiApiKey = writable<string>("");

async function correctText(ocrText: string, image: Blob): Promise<string> {
  const apiKey = get(openAiApiKey);
  if (!apiKey) {
    toastMessage.set("OpenAI API key is not set.");
    return Promise.reject("OpenAI API key is not set.");
  }

  // Convert image Blob to base64
  const base64Image = await blobToBase64(image);

  const payload = {
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: "You're a helpful assistant",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: ocrText,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 1024,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const errorMessage = `OpenAI GPT-4 Vision API call failed: ${response.statusText}, Body: ${errorBody}`;
    toastMessage.set(errorMessage);
    return Promise.reject(errorMessage);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      // Split the Data URL at the comma, and take the second part which is the base64 string
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.readAsDataURL(blob);
  });
}
export { openAiApiKey, correctText };
