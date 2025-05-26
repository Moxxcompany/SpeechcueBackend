import models from '../models/index.js';
const { Trunk } = models;

export const create = (data) => Trunk.create(data);
export const findAllByUser = (userId) => {
    if (!userId) throw new Error('userId is required');
    return Trunk.findAll({ where: { userId } });
};
export const findByIdAndUser = (id, userId) => Trunk.findOne({ where: { id, userId } });
export const findLastCreated = (userId) => Trunk.findOne({ where: { userId }, order: [['createdAt', 'DESC']] });
export const update = (id, userId, data) => Trunk.update(data, { where: { id, userId } });
export const remove = (id, userId) => Trunk.destroy({ where: { id, userId } });