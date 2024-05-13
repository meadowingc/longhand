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

    const formData = new FormData();
    formData.append('image', image);

    const response = await fetch(endpoint + '/vision/v3.0/ocr', {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/octet-stream'
        },
        body: formData
    });

    if (!response.ok) {
        const errorMessage = `Azure OCR API call failed: ${response.statusText}`;
        toastMessage.set(errorMessage);
        return Promise.reject(errorMessage);
    }

    const data = await response.json();
    // Assuming the response contains a field 'text' with the OCR result
    return data.text;
}

export { azureApiKey, azureEndpoint, analyzeImage };
