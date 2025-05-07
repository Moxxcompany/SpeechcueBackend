import { Storage } from '@google-cloud/storage';
import path from 'path';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

dotenv.config();

const storage = new Storage({
  keyFilename: path.resolve(process.env.GCS_KEY_PATH),
});

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

export const uploadAudioToGCS = async (localPath, destinationFileName) => {
  try {
    const file = bucket.file(destinationFileName);

    await bucket.upload(localPath, {
      destination: destinationFileName,
      gzip: true,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${destinationFileName}`;
    logger.info(`Uploaded to GCS: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    logger.error(`GCS Upload Failed: ${error.message}`);
    throw new Error(`Failed to upload audio to GCS: ${error.message}`);
  }
};
