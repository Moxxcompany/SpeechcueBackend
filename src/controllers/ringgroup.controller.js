import * as RingGroupService from '../services/ringgroup.service.js';
import * as FreePBXService from '../services/freepbx.service.js';


export const createRingGroup = async (req, res, next) => {
  try {
    let { ringGroupId, strategy, members, userId, description } = req.body;

    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    if (!ringGroupId) {
      const lastGroup = await RingGroupService.findLastCreated(userId);
      const lastId = lastGroup?.ringGroupId ? parseInt(lastGroup.ringGroupId) : 4999;
      ringGroupId = String(lastId + 1);
    }

    const existing = await RingGroupService.findByGroupNumberAndUser(ringGroupId, userId);
    if (existing) {
      return res.status(400).json({ success: false, message: `Ring Group ${ringGroupId} already exists.` });
    }

    await FreePBXService.createRingGroup({ ringGroupId, description, strategy, members });

    const ringGroup = await RingGroupService.create({
      ringGroupId,
      description,
      strategy,
      members,
      userId,
      phones: members,
    });

    res.status(200).json({ success: true, data: ringGroup });
  } catch (err) {
    next(err);
  }
};

export const getRingGroups = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const groups = await RingGroupService.findAllByUser(userId);
    res.status(200).json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
};

export const getRingGroupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const group = await RingGroupService.findByIdAndUser(id, userId);
    if (!group) return res.status(404).json({ success: false, message: 'Ring group not found' });
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
};

export const updateRingGroup = async (req, res, next) => {
  try {
    const { strategy, members, description } = req.body;
    const userId = req.userId || req.body.userId || req.params.userId;
    const id = req.params.id;

    const existing = await RingGroupService.findByIdAndUser(id, userId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ring group not found' });
    }

    const ringGroupId = existing.ringGroupId;

    // Update FreePBX first
    const success = await FreePBXService.updateRingGroup({
      ringGroupId,
      strategy: strategy || existing.strategy,
      members: members || existing.members,
      description: description || existing.description,
    });

    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update ring group in FreePBX',
      });
    }

    // Update in DB
    const updated = await RingGroupService.update(id, {
      strategy: strategy || existing.strategy,
      members: members || existing.members,
      description: description || existing.description,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};


export const deleteRingGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const group = await RingGroupService.findByIdAndUser(id, userId);
    if (!group) return res.status(404).json({ success: false, message: 'Ring group not found' });

    const isDeleted = await FreePBXService.deleteRingGroup(group.ringGroupId);
    if (!isDeleted) {
      return res.status(500).json({ success: false, message: 'Failed to delete ring group from FreePBX' });
    }

    await RingGroupService.remove(id, userId);

    return res.status(200).json({ success: true, message: 'Ring group deleted successfully' });
  } catch (err) {
    next(err);
  }
};