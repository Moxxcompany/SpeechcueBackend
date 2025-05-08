import { Storage } from '@google-cloud/storage';
import path from 'path';
import dotenv from 'dotenv';
import logger from '../config/logger.js';
import fs from 'fs';
import FormData from 'form-data';

dotenv.config();

const storage = new Storage({
  keyFilename: path.resolve(process.env.GCS_KEY_PATH),
});

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

const AUDIO_UPLOAD_URL = `http://${process.env.FREEPBX_IP_ADDRESS}:3000/api/audio/upload`;

export const uploadAudioToServer = async (localPath) => {
  try {
    const form = new FormData();
    const fileStream = fs.createReadStream(localPath);
    const fileName = path.basename(localPath);

    form.append('audio', fileStream, fileName);

    logger.info(`📤 Uploading - ${fileName} to server: ${AUDIO_UPLOAD_URL}`);

    const res = await fetch(AUDIO_UPLOAD_URL, {
      method: 'POST',
      body: form,
      headers: form.getHeaders() 
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error(`❌ Upload failed: ${errorText}`);
      throw new Error(`Upload failed: ${errorText}`);
    }

    const data = await res.json();
    const serverPath = data.asteriskPath;

    logger.info(`✅ Uploaded to Asterisk server at path: ${serverPath}`);
    return serverPath;
  } catch (err) {
    logger.error(`❌ Audio upload error: ${err.message}`);
    throw new Error(`Server audio upload failed: ${err.message}`);
  }
};

// export const uploadAudioToGCS = async (localPath, destinationFileName) => {
//   try {
//     const file = bucket.file(destinationFileName);

//     await bucket.upload(localPath, {
//       destination: destinationFileName,
//       gzip: true,
//       metadata: {
//         cacheControl: 'public, max-age=31536000',
//       },
//     });

//     const publicUrl = `https://storage.googleapis.com/${bucketName}/${destinationFileName}`;
//     logger.info(`Uploaded to GCS: ${publicUrl}`);

//     return publicUrl;
//   } catch (error) {
//     logger.error(`GCS Upload Failed: ${error.message}`);
//     throw new Error(`Failed to upload audio to GCS: ${error.message}`);
//   }
// };
