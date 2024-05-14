import OpenAI, { AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import type { ChatCompletionChunk } from "openai/src/resources/index.js";
import type { Stream } from "openai/streaming.mjs";
import { get, writable, type Writable } from "svelte/store";
import { toastMessage } from "./toastService";

const openAiApiKey = writable<string>("");

const useAzureOpenAI = writable<boolean>(false);
const azureOpenAiEndpoint = writable<string>("");
const azureOpenAiDeployment = writable<string>("");
const azureOpenAiKey = writable<string>("");
const azureOpenAiVersion = writable<string>("");

async function correctText(
  ocrText: string,
  image: Blob,
  onStreamTokenCollaback: (currentText: string, finished: boolean) => void
) {
  const base64Image = await blobToBase64(image);

  const messages: Array<ChatCompletionMessageParam> = [
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
  ];

  let responseStream: Stream<ChatCompletionChunk> | undefined = undefined;

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

    let openai = new AzureOpenAI({
      endpoint: get(azureOpenAiEndpoint),
      apiKey: get(azureOpenAiKey),
      apiVersion: get(azureOpenAiVersion),
      deployment: get(azureOpenAiDeployment),
      dangerouslyAllowBrowser: true,
    });

    responseStream = await openai.chat.completions.create(
      {
        model: get(azureOpenAiDeployment),
        stream: true,
        messages: messages,
        max_tokens: 2048,
      },
      { maxRetries: 5, stream: true }
    );
  } else {
    if (!get(openAiApiKey)) {
      toastMessage.set("OpenAI API key is not set.");
      return Promise.reject("OpenAI API key is not set.");
    }

    let openai = new OpenAI({
      apiKey: get(openAiApiKey),
      dangerouslyAllowBrowser: true,
    });

    responseStream = await openai.chat.completions.create(
      {
        model: "gpt-4-turbo",
        messages: messages,
        max_tokens: 2048,
        stream: true,
      },
      { maxRetries: 5 }
    );
  }

  let responseText = "";
  for await (const chunk of responseStream) {
    let newOutput = chunk.choices[0]?.delta?.content || "";
    responseText += newOutput;
    onStreamTokenCollaback(responseText, false);
  }

  onStreamTokenCollaback(responseText, true);
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
  azureOpenAiDeployment,
  azureOpenAiEndpoint,
  azureOpenAiKey,
  azureOpenAiVersion,
  correctText,
  openAiApiKey,
  useAzureOpenAI,
};
