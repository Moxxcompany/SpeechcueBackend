import models from '../models/index.js';

const { RingGroup } = models;

export const create = (data) => RingGroup.create(data);

export const findAll = () => RingGroup.findAll();

export const findById = (id) => RingGroup.findByPk(id);

export const findLastCreated = () =>
  RingGroup.findOne({ order: [['createdAt', 'DESC']] });

export const findByGroupNumber = (ringGroupId) =>
  RingGroup.findOne({ where: { name: ringGroupId } });

export const update = async (id, data) => {
  const group = await RingGroup.findByPk(id);
  if (!group) return null;
  return group.update(data);
};

export const remove = async (id) => {
  const group = await RingGroup.findByPk(id);
  if (!group) return null;
  await group.destroy();
  return true;
};
