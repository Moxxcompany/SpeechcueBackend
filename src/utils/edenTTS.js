import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

const EDEN_AI_API_KEY = process.env.EDEN_AI_API_KEY;
const EDEN_AI_API_URL = process.env.EDEN_AI_API_URL || 'https://api.edenai.run/v2';
const AUDIO_UPLOAD_URL = `${process.env.ASTERISK_MIDDLEWARE_SERVER_URL}/api/audio/upload`;

export const generateTTS = async (node, localPath, fileName) => {
    const text = node?.data?.text || '';
    const nodeVoiceSettings  = {
      providers: node?.voice?.providers || 'google',
      language: node?.voice?.language || 'en',
      option: node?.voice?.option || 'FEMALE',
      audio_format: 'wav',
    }
    try {
  
      // Step 1: Call Eden AI
      const ttsRes = await fetch(`${EDEN_AI_API_URL}/audio/text_to_speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EDEN_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providers: nodeVoiceSettings?.providers || 'google',
          language: nodeVoiceSettings?.language || 'en',
          option: nodeVoiceSettings?.option || 'FEMALE',
          text,
          audio_format: 'wav',
        }),
      });
  
      if (!ttsRes.ok) {
        const error = await ttsRes.text();
        throw new Error(`EdenAI TTS API failed: ${error}`);
      }
  
      const ttsJson = await ttsRes.json();
      const base64Audio = ttsJson?.google?.audio;
  
      if (!base64Audio) throw new Error('EdenAI response missing audio');
  
      // Step 2: Create FormData with buffer
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      const form = new FormData();
      form.append('audio', audioBuffer, { filename: fileName, contentType: 'audio/wav' });
  
      // Step 3: Upload to Asterisk Audio Server
      const uploadRes = await fetch(AUDIO_UPLOAD_URL, {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      });
  
      if (!uploadRes.ok) {
        const error = await uploadRes.text();
        throw new Error(`Upload failed: ${error}`);
      }
  
      const uploadResult = await uploadRes.json();
      return uploadResult.asteriskPath; // e.g., custom/tts_xxx.wav
    } catch (err) {
      throw new Error(`TTS + Upload failed: ${err.message}`);
    }
  };

// export const generateTTS = async (text, outputPath) => {
//     try {
//         console.log('EdenAI API Key:', EDEN_AI_API_KEY);
//         const response = await fetch('https://api.edenai.run/v2/audio/text_to_speech', {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${EDEN_AI_API_KEY}`,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//                 providers: 'google',
//                 language: 'en-US',
//                 option: 'FEMALE',
//                 text,
//                 audio_format: "wav"
//             }),
//         });

//         if (!response.ok) {
//             const errorText = await response.text();
//             throw new Error(`EdenAI TTS API failed: ${errorText}`);
//         }

//         const result = await response.json();
//         const base64Audio = result?.google?.audio;
        
  
//         if (!base64Audio) throw new Error('EdenAI TTS returned no base64 audio');
  
//         const audioBuffer = Buffer.from(base64Audio, 'base64');
//         await fs.mkdir(path.dirname(outputPath), { recursive: true });
//         const res = await fs.writeFile(outputPath, audioBuffer);
//         console.log("RESPONSE",res)
//         return res;
//         // const audioUrl = result?.google?.audio_resource_url;
//         // console.log('Audio URL:', result?.google);
//         // if (!audioUrl) throw new Error('Audio URL not found in EdenAI response');

//         // const audioRes = await fetch(audioUrl);
//         // if (!audioRes.ok) throw new Error('Failed to download TTS audio file');

//         // const audioBuffer = await audioRes.buffer();
//         // await fs.mkdir(path.dirname(outputPath), { recursive: true });
//         // await fs.writeFile(outputPath, Buffer.from(audioBuffer));
//     } catch (error) {
//         throw new Error(`TTS generation failed: ${error.message}`);
//     }
// };
