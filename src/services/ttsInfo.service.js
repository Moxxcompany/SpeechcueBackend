import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const EDEN_AI_API_URL = process.env.EDEN_AI_API_URL || 'https://api.edenai.run/v2';
const EDEN_API_URL = `${EDEN_AI_API_URL}/info/provider_subfeatures`;

const getProviderSubfeaturesList = async () => {

    const subfeature = 'text_to_speech';
    const url = new URL(EDEN_API_URL);
    url.searchParams.append('subfeature__name', subfeature);

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });


    if (!response.ok) {
        const error = await response.text();
        throw new Error(`EdenAI Error: ${error}`);
    }

    return response.json();
};

export const fetchTTSProvidersAndLanguages = async () => {
    const data = await getProviderSubfeaturesList();
    return data
};

