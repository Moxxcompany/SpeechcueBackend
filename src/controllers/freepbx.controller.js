import * as freepbxService from '../services/freepbx.service.js';
import logger from '../config/logger.js';

export const createExtension = async (req, res, next) => {
  try {
    const extension = await freepbxService.createExtension(req.body);
    logger.info(`Extension created: ${JSON.stringify(extension)}`);
    res.status(201).json({ message: 'Extension created successfully', extension });
  } catch (error) {
    logger.error(`Failed to create extension: ${error.message}`);
    next(error);
  }
};
