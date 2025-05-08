import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '../audio/tts');

export async function textToSpeech(text) {
  try {
    if (!fs.existsSync(AUDIO_DIR)) {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
    }

    const hash = createHash('md5').update(text).digest('hex').slice(0, 16);
    const fileName = `tts-${hash}.wav`;
    const filePath = path.join(AUDIO_DIR, fileName);

    // If file already exists, return it
    if (fs.existsSync(filePath)) {
      return fileName.replace('.wav', '');
    }

    const response = await fetch('https://api.edenai.run/v2/audio/text_to_speech', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.EDEN_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        providers: 'google',
        language: 'en-US',
        option: 'FEMALE',
        text,
        audio_format: "wav"
      }),
    });

    const data = await response.json();
    console.log('TTS Response:', JSON.stringify(data));
    const audioUrl = data.google.audio_resource_url;
    console.log('Audio URL:', audioUrl);
    const audioRes = await fetch(audioUrl);
    const audioBuffer = await audioRes.buffer();

    fs.writeFileSync(filePath, audioBuffer);
    return fileName.replace('.wav', '');
  } catch (error) {
    console.error('❌ TTS Error:', error);
    throw error;
  }
}
