# ✍ Longhand

Longhand is a simple web-app that allows you to reliably extract handwritten
text from photos, mainly oriented towards people that want to digitalize their
journals and/or write blog posts with pen and paper.

Check out [the wiki](https://codeberg.org/meadowingc/longhand/wiki/Home) for
more information on how to use.

## Getting Started

The easiest way to get started is to head over to [the
website](https://longhand.meadowing.club/) and use it from there (refer to [the
wiki](https://codeberg.org/meadowingc/longhand/wiki/Home) for more info on how
to get everything set up). If you want to run it locally, follow the
instructions below.

Longhand transcribes images directly with a vision-language model. Azure
Cognitive Services OCR is no longer required. Use OpenAI, an OpenAI-compatible
provider such as OpenRouter, or the optional Azure OpenAI integration.

### OpenAI API Key

1. Sign up or log in to your account on the [OpenAI
   website](https://openai.com/).
2. Navigate to the "API Keys" section in the dashboard.
3. Generate a new API key or use an existing one for your application.

Once you have obtained your API keys, you can enter them into the application's
configuration to start using the services.

OpenAI defaults to `https://api.openai.com/v1` with model `gpt-4o`. API usage
requires funded API billing; a ChatGPT subscription does not include API credits.
Insufficient credits, authentication failures, and rate limits are reported in
the application rather than leaving images stuck loading.

### OpenAI-compatible providers

In Settings, enter your provider's API key, API base URL, and exact
image-capable model ID. For example, OpenRouter uses
`https://openrouter.ai/api/v1` and model IDs such as `openai/gpt-4o`.
Do not append `/chat/completions` to the base URL.

Requests go directly from your browser to the provider, so the endpoint must
allow browser requests (CORS) and streaming Chat Completions with image input.
An HTTPS deployment cannot access an HTTP endpoint; for local model servers,
run Longhand locally or expose the server over HTTPS with appropriate CORS.

API keys are stored unencrypted in browser local storage. Exported configuration
also contains keys: do not share it. Existing OpenAI and Azure OpenAI settings
remain usable; obsolete Azure OCR credentials are removed from local storage.

Upload or paste JPEG, PNG, WEBP, or GIF images. Export HEIC photos as JPEG or PNG
first. The browser UI works on desktop and mobile; no separate OCR runtime is
required. Optional local OCR is not included.

Enable sequential processing to use previous transcriptions as context for each
new image. Only the current image's text is output. Sequential processing stops
on a failure; otherwise images are processed concurrently. Partial output is
marked incomplete if the stream fails or reaches the model's output limit.

### Azure OpenAI Service (Optional)

If you would prefer to use Azure OpenAI Service, you can use it directly by
obtaining the necessary configuration details:

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Create a new OpenAI resource.
3. Once the resource is created, navigate to the 'Keys and Endpoint' section.
4. Copy the 'Endpoint URL', 'Deployment Name', 'Key', and 'Version' for your
   application.

The deployment must support image input. This is Azure OpenAI, not the removed
Azure Cognitive Services OCR endpoint.

Once you have obtained your API keys and/or Azure OpenAI Service details, you
can enter them into the application's configuration to start using the services.

## Running the Application

To run the application locally, follow these steps:

1. Install the dependencies with `yarn install`.
2. Start the development server with `yarn dev`.
3. Open your browser and navigate to `http://localhost:3000`.
