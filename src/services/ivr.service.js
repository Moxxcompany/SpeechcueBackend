import models from '../models/index.js';
import { generateTTS } from '../utils/edenTTS.js';
import { uploadAudioToGCS } from '../utils/gcsUploader.js';
import logger from '../config/logger.js';
import path from 'path';

const { IVR, PhoneNumber } = models;

const TEMP_AUDIO_DIR = './temp-audio';
// Sanitize names to be filename-safe
const sanitize = str => str.replace(/[^a-zA-Z0-9-_]/g, '_');

export const createIVRWithAudio = async ({ userId, name, description, flow }) => {
  const tempFiles = [];

  try {
    const sanitizedIVRName = sanitize(name);

    const updatedNodes = await Promise.all(
      flow?.nodes?.map(async (node) => {
        if (node.type === 'tts') {
          const nodeId = sanitize(node.id);
          const timestamp = Date.now();
          const fileName = `tts_${sanitizedIVRName}_${nodeId}_${timestamp}.wav`;
          const localPath = path.join(TEMP_AUDIO_DIR, fileName);

          logger.info(`🎤 Generating TTS: ${node.data.text} -> ${fileName}`);
          await generateTTS(node.data.text, localPath);
          tempFiles.push(localPath); // For rollback

          const gcsPath = `ivr-audio/${fileName}`;
          const gcsUrl = await uploadAudioToGCS(localPath, gcsPath);

          return {
            ...node,
            data: {
              ...node.data,
              audioUrl: gcsUrl
            }
          };
        }

        return node;
      })
    );

    const updatedFlow = {
      nodes: updatedNodes,
      edges: flow.edges
    };

    const ivr = await IVR.create({ userId, name, description, flow: updatedFlow });
    logger.info(`✅ IVR created for user ${userId}: ${ivr._id}`);

    return ivr;
  } catch (error) {
    logger.error(`❌ IVR creation failed: ${error.message}`);

    // Cleanup any temp audio files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (err) {
        logger.warn(`⚠ Failed to delete temp file: ${file}`);
      }
    }

    throw error;
  }
};

export const createIVR = (data) => IVR.create(data);

export const getAllIVRsByUser = (userId) => IVR.findAll({ where: { userId } });

export const getIVRById = (id, userId) => IVR.findOne({ where: { id, userId } });

export const updateIVR = async (id, userId, data) => {
  const ivr = await getIVRById(id, userId);
  if (!ivr) return null;
  return ivr.update(data);
};

export const deleteIVR = async (id, userId) => {
  const ivr = await getIVRById(id, userId);
  if (!ivr) return null;
  await ivr.destroy();
  return ivr;
};

export const assignNumberToIVR = async (ivrId, phoneNumberId) => {
  const ivr = await IVR.findByPk(ivrId);
  const number = await PhoneNumber.findByPk(phoneNumberId);
  if (!ivr || !number) return null;

  number.ivrId = ivrId;
  await number.save();
  return number;
};

export const deassignNumberFromIVR = async (phoneNumberId) => {
  const number = await PhoneNumber.findByPk(phoneNumberId);
  if (!number) return null;

  number.ivrId = null;
  await number.save();
  return number;
};
