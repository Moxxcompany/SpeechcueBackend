import models from '../models/index.js';

const { IVR, PhoneNumber } = models;

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
