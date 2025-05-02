import * as freepbxService from '../services/freepbx.service.js';
import logger from '../config/logger.js';

export const createExtension = async (req, res, next) => {
  try {
    logger.info('📥 Creating extension with data: %j', req.body);
    const extension = await freepbxService.createExtension(req.body);
    logger.info('✅ Extension created successfully: %j', extension);
    res.status(201).json({ message: 'Extension created successfully', extension });
  } catch (error) {
    logger.error('❌ Failed to create extension: %s', error.message);
    next(error);
  }
};

export const getAllExtensions = async (req, res, next) => {
  try {
    const userId = req?.user?._id || req?.query?.userId; // Admins may query by param
    logger.info(`📄 Fetching all extensions for user: ${userId}`);
    const extensions = await freepbxService.getAllExtensions(userId);
    logger.info('✅ Retrieved %d extensions', extensions.length);
    res.json({ data: extensions });
  } catch (error) {
    logger.error('❌ Failed to fetch all extensions: %s', error.message);
    next(error);
  }
};

export const getExtensionById = async (req, res, next) => {
  try {
    const userId = req?.user?._id || req?.query?.userId;
    const id = req?.params?.id;
    logger.info(`🔍 Fetching extension with ID: ${id} for user: ${userId}`);
    const extension = await freepbxService.getExtensionById(id, userId);
    if (!extension) {
      logger.warn(`⚠️ Extension ${id} not found or access denied`);
      return res.status(404).json({ message: 'Extension not found or access denied' });
    }
    logger.info(`✅ Extension found: %j`, extension);
    res.json({ extension });
  } catch (error) {
    logger.error(`❌ Failed to fetch extension ${req.params.id}: ${error.message}`);
    next(error);
  }
};

export const updateExtension = async (req, res, next) => {
  try {
    const userId = req?.user?._id || req?.query?.userId;
    const id = req?.params?.id;
    logger.info(`✏️ Updating extension ${id} for user ${userId}`);
    const extension = await freepbxService.updateExtension(id, req.body, userId);
    res.json({ message: 'Extension updated successfully', extension });
  } catch (error) {
    logger.error(`❌ Failed to update extension ${req.params.id}: ${error.message}`);
    next(error);
  }
};

export const deleteExtension = async (req, res, next) => {
  try {
    const userId = req?.user?._id || req?.query?.userId;
    const id = req?.params?.id;
    logger.info(`🗑️ Deleting extension ${id} for user ${userId}`);
    await freepbxService.deleteExtension(id, userId);
    res.json({ message: 'Extension deleted successfully' });
  } catch (error) {
    logger.error(`❌ Failed to delete extension ${req.params.id}: ${error.message}`);
    next(error);
  }
};