import * as TrunkService from '../services/trunk.service.js';
import logger from '../config/logger.js';

export const createTrunk = async (req, res, next) => {
  try {
    const data = req.body;
    const trunk = await TrunkService.create(data);
    res.status(200).json({ success: true, data: trunk });
  } catch (err) {
    logger.error('Error creating trunk:', err);
    next(err);
  }
};

export const getTrunks = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    console.log('Fetching trunks for user:', userId);
    const trunks = await TrunkService.findAllByUser(userId);
    res.status(200).json({ success: true, data: trunks });
  } catch (err) {
    logger.error('Error fetching trunks:', err);
    next(err);
  }
};

export const getTrunkById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    logger.info('Fetching trunk for user:', userId);
    const trunk = await TrunkService.findByIdAndUser(id, userId);
    res.status(200).json({ success: true, data: trunk });
  } catch (err) {
    logger.error('Error fetching trunk:', err);
    next(err);
  }
};

export const updateTrunk = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.userId;
    logger.info('Updating trunk for user:', userId);
    const updated = await TrunkService.update(id, userId, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteTrunk = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    logger.info('Deleting trunk for user:', userId);
    await TrunkService.remove(id, userId);
    res.status(200).json({ success: true, message: 'Trunk deleted successfully' });
  } catch (err) {
    logger.error('Error deleting trunk:', err);
    next(err);
  }
};