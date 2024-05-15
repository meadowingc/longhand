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

To run this application, you will need API keys for Azure and/or OpenAI
services. You can choose to use Azure Cognitive Services for OCR and OpenAI's
GPT-4 for text completion, or you can use Azure's OpenAI service directly if you
have access to it. Follow the steps below to obtain your keys:

### Azure Cognitive Services API Key

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Create a new Cognitive Services resource.
3. Once the resource is created, navigate to the 'Keys and Endpoint' section.
4. Copy the 'KEY1' or 'KEY2' for your application.

Note: _Azure Cognitive Services_ offers a free pricing tier that should be more
than enough for personal use.

### OpenAI API Key

1. Sign up or log in to your account on the [OpenAI
   website](https://openai.com/).
2. Navigate to the "API Keys" section in the dashboard.
3. Generate a new API key or use an existing one for your application.

Once you have obtained your API keys, you can enter them into the application's
configuration to start using the services.

### Azure OpenAI Service (Optional)

If you would prefer to use Azure OpenAI Service, you can use it directly by
obtaining the necessary configuration details:

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Create a new OpenAI resource.
3. Once the resource is created, navigate to the 'Keys and Endpoint' section.
4. Copy the 'Endpoint URL', 'Deployment Name', 'Key', and 'Version' for your
   application.

Note: The Azure OpenAI Service is currently in preview and may not be available
to all users. Also, the deployment you create MUST have vision capabilities (for
example, GPT4 vision).

Once you have obtained your API keys and/or Azure OpenAI Service details, you
can enter them into the application's configuration to start using the services.

## Running the Application

To run the application locally, follow these steps:

1. Install the dependencies with `yarn install`.
2. Start the development server with `yarn dev`.
3. Open your browser and navigate to `http://localhost:3000`.
