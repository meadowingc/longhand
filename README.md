# ✍ Longhand

Longhand is a simple web-app that allows you to reliably extract handwritten text from photos, mainly oriented towards people that want to digitalize their journals and/or write blog posts with pen and paper.

Check out [the wiki](https://codeberg.org/meadowingc/longhand/wiki/Home) for
more information on how to run.

## Getting Started

To run this application, you will need API keys for Azure and OpenAI services. Follow the steps below to obtain your keys:

### Azure Cognitive Services API Key

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Create a new Cognitive Services resource.
3. Once the resource is created, navigate to the 'Keys and Endpoint' section.
4. Copy the 'KEY1' or 'KEY2' for your application.

Note: Azure Cognitive Services offers a free pricing tier that should be more than enough for personal use.

### OpenAI API Key

1. Sign up or log in to your account on the [OpenAI website](https://openai.com/).
2. Navigate to the "API Keys" section in the dashboard.
3. Generate a new API key or use an existing one for your application.

Once you have obtained your API keys, you can enter them into the application's configuration to start using the services.

## Running the Application

To run the application locally, follow these steps:

1. Install the dependencies with `yarn install`.
2. Start the development server with `yarn dev`.
3. Open your browser and navigate to `http://localhost:3000`.

Enjoy the application and explore the capabilities of Azure OCR and OpenAI GPT-4!
