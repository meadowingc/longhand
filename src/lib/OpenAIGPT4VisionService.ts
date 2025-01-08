import OpenAI, { AzureOpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import type { ChatCompletionChunk } from "openai/src/resources/index.js";
import type { Stream } from "openai/streaming.mjs";
import { get, writable, type Writable } from "svelte/store";
import { toastMessage } from "./toastService";

const openAiApiKey = writable<string>("");

const threadOutputsFromOneRequestToTheNext = writable<boolean>(false);
const useAzureOpenAI = writable<boolean>(false);
const azureOpenAiEndpoint = writable<string>("");
const azureOpenAiDeployment = writable<string>("");
const azureOpenAiKey = writable<string>("");
const azureOpenAiVersion = writable<string>("");
const customExtraPrompt = writable<string>("");

async function correctText(
  ocrText: string,
  image: Blob,
  previousTexts: string[],
  onStreamTokenCollaback: (currentText: string, finished: boolean) => void
) {
  const base64Image = await blobToBase64(image);

  let systemPrompt = `
You are an advanced AI trained to correct errors in text extracted from images of handwritten documents. The user will provide you two inputs:

1. The raw text of that image as extracted by an OCR (Optical Character Recognition) process.
2. An image of handwritten text (from a journal or similar source).

Your output should consist solely of the corrected text. You are to make no other comments or provide any additional information. You should only correct mistakes that are due to OCR errors, such as misread characters or words, and not attempt to correct grammatical errors that were present in the original handwritten text. 

The OCR process will often output incorrect text so it's up to you to correct a character or word that doesn't seem to make sense in its context. Other than that you should leave the text unchaged so as to preserve the look and feeling of the original.

Please output the corrected text in a clean and readable format, ready for use. Please represent as proper markdown any text formatting that you see in the picture: paragraph breaks, lists, and quotes, etc.
`;

  if (previousTexts.length > 0) {
    systemPrompt += `
The image you've been provided is part of a sequence of images. This is the text extracted from the previous images in the sequence:

\`\`\`
${previousTexts.join("\n\n")}
\`\`\`
`;
  }

  if (get(customExtraPrompt).trim() !== "") {
    systemPrompt += `
The user of the application, who wrote the text you are correcting, has provided the following additional prompt:

\`\`\`
${get(customExtraPrompt)}
\`\`\`
`;
  }


  const messages: Array<ChatCompletionMessageParam> = [
    {
      role: "system",
      content: systemPrompt,
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
        model: "gpt-4o",
        messages: messages,
        max_tokens: 2048,
        stream: true,
      },
      { maxRetries: 5 }
    );
  }

  let responseText = "";
  let finishReason = "";
  let lastChoice = undefined;
  for await (const chunk of responseStream) {
    let newOutput = chunk.choices[0]?.delta?.content || "";
    finishReason = chunk.choices[0]?.finish_reason || "";
    lastChoice = chunk.choices[0];

    responseText += newOutput;

    if (responseText.trim() === "") {
      // show ellipses as a loading indicator if text is still empty
      onStreamTokenCollaback("...", false);
    } else {
      onStreamTokenCollaback(responseText, false);
    }
  }

  if (finishReason === "content_filter") {
    let newText = `${responseText}\n\nERROR: GPT response finished because of content filter:\n\n`;
    newText += JSON.stringify(
      (lastChoice as any)?.content_filter_results,
      null,
      2 // indent two spaces
    );

    newText = newText.trim();

    onStreamTokenCollaback(newText, true);
  } else {
    onStreamTokenCollaback(responseText, true);
  }
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
  customExtraPrompt,
  threadOutputsFromOneRequestToTheNext,
};
