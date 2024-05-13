import { writable, get } from 'svelte/store';
import { toastMessage } from './toastService';

const azureApiKey = writable<string>('');
const azureEndpoint = writable<string>('');

async function analyzeImage(image: Blob): Promise<string> {
    const apiKey = get(azureApiKey);
    const endpoint = get(azureEndpoint);
    if (!apiKey || !endpoint) {
        toastMessage.set('Azure API key or endpoint is not set.');
        return Promise.reject('Azure API key or endpoint is not set.');
    }

    const response = await fetch(endpoint + '/computervision/imageanalysis:analyze?features=read&model-version=latest&language=en&gender-neutral-caption=false&api-version=2023-10-01', {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/octet-stream'
        },
        body: image
    });

    if (!response.ok) {
        const errorMessage = `Azure OCR API call failed: ${response.statusText}`;
        toastMessage.set(errorMessage);
        return Promise.reject(errorMessage);
    }

    const data = await response.json();
    // Extract and concatenate all the words from the response
    const text = data.readResult.blocks.flatMap(region => 
        region.lines.flatMap(line => 
            line.words.map(word => word.text)
        )
    ).join(' ');
    return text;
}

export { azureApiKey, azureEndpoint, analyzeImage };
