import models from '../models/index.js';

const { CallLog } = models;

export const create = (data) => CallLog.create(data);

export const findAll = (query = {}) => {
  const where = {};
  if (query.ivrId) where.ivrId = query.ivrId;
  return CallLog.findAll({ where });
};

export const findById = (id) => CallLog.findByPk(id);

export const update = async (id, data) => {
  const record = await CallLog.findByPk(id);
  if (!record) return null;
  return record.update(data);
};

export const remove = async (id) => {
  const record = await CallLog.findByPk(id);
  if (!record) return null;
  await record.destroy();
  return true;
};

export const findByIVRId = (ivrId) => {
  return CallLog.findAll({ where: { ivrId } });
};