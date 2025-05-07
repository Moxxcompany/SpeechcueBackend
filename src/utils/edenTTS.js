import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const EDEN_AI_API_KEY = process.env.EDEN_AI_API_KEY;

export const generateTTS = async (text, outputPath) => {
    try {
        console.log('EdenAI API Key:', EDEN_AI_API_KEY);
        const response = await fetch('https://api.edenai.run/v2/audio/text_to_speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${EDEN_AI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                providers: 'google',
                language: 'en-US',
                option: 'FEMALE',
                text,
                output_format: 'wav',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`EdenAI TTS API failed: ${errorText}`);
        }

        const result = await response.json();
        const base64Audio = result?.google?.audio;
        
  
        if (!base64Audio) throw new Error('EdenAI TTS returned no base64 audio');
  
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        const res = await fs.writeFile(outputPath, audioBuffer);
        console.log("RESPONSE",res)
        // const audioUrl = result?.google?.audio_resource_url;
        // console.log('Audio URL:', result?.google);
        // if (!audioUrl) throw new Error('Audio URL not found in EdenAI response');

        // const audioRes = await fetch(audioUrl);
        // if (!audioRes.ok) throw new Error('Failed to download TTS audio file');

        // const audioBuffer = await audioRes.buffer();
        // await fs.mkdir(path.dirname(outputPath), { recursive: true });
        // await fs.writeFile(outputPath, Buffer.from(audioBuffer));
    } catch (error) {
        throw new Error(`TTS generation failed: ${error.message}`);
    }
};
