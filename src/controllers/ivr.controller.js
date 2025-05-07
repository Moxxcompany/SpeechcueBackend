import logger from '../config/logger.js';
import * as ivrService from '../services/ivr.service.js';

export const createIVR = async (req, res, next) => {
    try {
        const { userId, name, description, flow } = req.body;
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

        const ivr = await ivrService.createIVRWithAudio({ userId, name, description, flow });
        res.status(201).json(ivr);
    } catch (error) {
        logger.error(`Create IVR failed: ${error.message}`);
        next(error);
    }
};

export const getAllIVRs = async (req, res, next) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

        const ivrs = await ivrService.getAllIVRsByUser(userId);
        res.json(ivrs);
    } catch (error) {
        logger.error(`Get All IVRs failed: ${error.message}`);
        next(error);
    }
};

export const getIVR = async (req, res, next) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

        const ivr = await ivrService.getIVRById(req.params.id, userId);
        if (!ivr) return res.status(404).json({ message: 'IVR not found' });

        res.json(ivr);
    } catch (error) {
        logger.error(`Get IVR failed: ${error.message}`);
        next(error);
    }
};

export const updateIVR = async (req, res, next) => {
    try {
        const { userId, name, description, flow } = req.body;
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

        const updated = await ivrService.updateIVR(req.params.id, userId, { name, description, flow });
        if (!updated) return res.status(404).json({ message: 'IVR not found' });

        res.json(updated);
    } catch (error) {
        logger.error(`Update IVR failed: ${error.message}`);
        next(error);
    }
};

export const deleteIVR = async (req, res, next) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'User ID is required' });

        const deleted = await ivrService.deleteIVR(req.params.id, userId);
        if (!deleted) return res.status(404).json({ message: 'IVR not found' });

        res.json({ message: 'IVR deleted successfully' });
    } catch (error) {
        logger.error(`Delete IVR failed: ${error.message}`);
        next(error);
    }
};

export const assignNumberToIVR = async (req, res, next) => {
    try {
        const { ivrId, phoneNumberId } = req.body;
        const assigned = await ivrService.assignNumberToIVR(ivrId, phoneNumberId);
        if (!assigned) return res.status(404).json({ message: 'IVR or Phone Number not found' });

        res.json({ message: 'Number assigned to IVR', data: assigned });
    } catch (err) {
        next(err);
    }
};

export const deassignNumberFromIVR = async (req, res, next) => {
    try {
        const { phoneNumberId } = req.body;
        const updated = await ivrService.deassignNumberFromIVR(phoneNumberId);
        if (!updated) return res.status(404).json({ message: 'Phone Number not found' });

        res.json({ message: 'Number deassigned from IVR', data: updated });
    } catch (err) {
        next(err);
    }
};