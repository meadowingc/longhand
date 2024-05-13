import { writable, get } from "svelte/store";
import { toastMessage } from "./toastService";

const openAiApiKey = writable<string>("");

const useAzureOpenAI = writable<boolean>(false);
const azureOpenAiEndpoint = writable<string>("");
const azureOpenAiDeployment = writable<string>("");
const azureOpenAiKey = writable<string>("");
const azureOpenAiVersion = writable<string>("");

async function correctText(ocrText: string, image: Blob): Promise<string> {
  const base64Image = await blobToBase64(image);

  const payload = {
    model: get(useAzureOpenAI) ? get(azureOpenAiDeployment) : "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: `
You are an advanced AI trained to correct errors in text extracted from images of handwritten documents. The user will provide you two inputs:

1. The raw text of that image as extracted by an OCR (Optical Character Recognition) process.
2. An image of handwritten text (from a journal or similar source).

Your output should consist solely of the corrected text. You are to make no other comments or provide any additional information. You should only correct mistakes that are due to OCR errors, such as misread characters or words, and not attempt to correct grammatical errors that were present in the original handwritten text. 

The OCR process will often output incorrect text so it's up to you to correct a character or word that doesn't seem to make sense in its context. Other than that you should leave the text unchaged so as to preserve the look and feeling of the original.

Please output the corrected text in a clean and readable format, ready for use. Please represent as proper markdown any text formatting that you see in the picture: paragraph breaks, lists, and quotes, etc.
`,
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

  let endpoint: string = "";
  let headers: HeadersInit = {};

  if (get(useAzureOpenAI)) {
    if (
      !get(azureOpenAiEndpoint) ||
      !get(azureOpenAiKey) ||
      !get(azureOpenAiDeployment) ||
      !get(azureOpenAiVersion)
    ) {
      toastMessage.set("Azure OpenAI parameters are not set.");
      return Promise.reject("Azure OpenAI parameters are not set.");
    }

    endpoint = `${get(azureOpenAiEndpoint)}/openai/deployments/${get(
      azureOpenAiDeployment
    )}/chat/completions?api-version=${get(azureOpenAiVersion)}`;

    headers = {
      "api-key": get(azureOpenAiKey),
      "Content-Type": "application/json",
    };
  } else {
    if (!get(openAiApiKey)) {
      toastMessage.set("OpenAI API key is not set.");
      return Promise.reject("OpenAI API key is not set.");
    }

    endpoint = "https://api.openai.com/v1/chat/completions";

    headers = {
      Authorization: `Bearer ${get(openAiApiKey)}`,
      "Content-Type": "application/json",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: headers,
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

export {
  openAiApiKey,
  useAzureOpenAI,
  azureOpenAiEndpoint,
  azureOpenAiDeployment,
  azureOpenAiKey,
  azureOpenAiVersion,
  correctText,
};
