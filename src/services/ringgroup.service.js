  import models from '../models/index.js';

const { RingGroup } = models;

// Create a new ring group
export const create = (data) => RingGroup.create(data);

// Get all ring groups for a specific user
export const findAll = (userId) => {
  if (!userId) throw new Error('userId is required');
  return RingGroup.findAll({ where: { userId } });
};

// Get a specific ring group by ID and user
export const findById = (id, userId) => {
  if (!userId) throw new Error('userId is required');
  return RingGroup.findOne({ where: { id, userId } });
};

export const findAllByUser = (userId) => {
  return RingGroup.findAll({ where: { userId } });
};

export const findByIdAndUser = (id, userId) => {
  return RingGroup.findOne({
    where: {
      id,
      userId,
    },
  });
};


// Find the last created ring group for auto-incrementing
export const findLastCreated = () =>
  RingGroup.findOne({ order: [['createdAt', 'DESC']] });

// Find a ring group by its group number (used for validation)
export const findByGroupNumber = (ringGroupId, userId) => {
  if (!userId) throw new Error('userId is required');
  return RingGroup.findOne({ where: { ringGroupId, userId } });
};

export const findByIdWithoutAuth = (ringGroupId) => {
  return RingGroup.findOne({ where: { id: ringGroupId } });
};

export const findByGroupNumberAndUser = (ringGroupId, userId) => {
  if (!ringGroupId || !userId) throw new Error('ringGroupId and userId are required');
  return RingGroup.findOne({ where: { ringGroupId, userId } });
};


// Update ring group by ID and user
export const update = async (id, userId, data) => {
  const group = await RingGroup.findOne({ where: { id, userId } });
  if (!group) {
    console.error(`❌ Cannot find ring group to update for id=${id} userId=${userId}`);
    return null;
  }

  try {
    const updated = await group.update(data);
    console.info(`✅ Updated ring group ${group.ringGroupId} in DB`);
    return updated;
  } catch (err) {
    console.error('❌ DB update failed:', err.message);
    throw err;
  }
};


// Delete ring group by ID and user
export const remove = async (id, userId) => {
  const group = await RingGroup.findOne({ where: { id, userId } });
  if (!group) return null;
  await group.destroy();
  return true;
};
