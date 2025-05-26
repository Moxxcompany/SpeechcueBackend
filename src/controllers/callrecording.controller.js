import * as CallRecordingService from '../services/callrecording.service.js';

export const getAll = async (req, res, next) => {
  try {
    const data = await CallRecordingService.findAll(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const data = await CallRecordingService.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = await CallRecordingService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const data = await CallRecordingService.update(req.params.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await CallRecordingService.remove(req.params.id);
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
