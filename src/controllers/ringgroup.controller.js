import * as RingGroupService from '../services/ringgroup.service.js';
import * as FreePBXService from '../services/freepbx.service.js';

export const createRingGroup = async (req, res, next) => {
  try {
    let { ringGroupId, strategy, members, userId, description } = req.body;

    // Auto-generate ringGroupId if not provided
    if (!ringGroupId) {
      const lastGroup = await RingGroupService.findLastCreated();
      const lastId = lastGroup?.ringGroupId ? parseInt(lastGroup.ringGroupId) : 4999;
      ringGroupId = String(lastId + 1);
    }

    // Ensure ringGroupId is unique
    const existing = await RingGroupService.findByGroupNumber(ringGroupId);
    if (existing) {
      return res.status(400).json({ success: false, message: `Ring Group ${ringGroupId} already exists.` });
    }

    // Create in FreePBX
    await FreePBXService.createRingGroup({ ringGroupId, description, strategy, members });

    // Create in DB
    const ringGroup = await RingGroupService.create({
      ringGroupId,
      description,
      strategy,
      members,
      userId,
      name: ringGroupId,
      phones: members,
    });

    res.status(200).json({ success: true, data: ringGroup });
  } catch (err) {
    next(err);
  }
};

export const getRingGroups = async (req, res, next) => {
  try {
    const groups = await RingGroupService.findAll();
    res.status(200).json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
};

export const getRingGroupById = async (req, res, next) => {
  try {
    const group = await RingGroupService.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Ring group not found' });
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
};

export const updateRingGroup = async (req, res, next) => {
  try {
    const existing = await RingGroupService.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ring group not found' });
    }

    const { ringGroupId, strategy, members, description } = req.body;

    // Try updating FreePBX first
    const success = await FreePBXService.updateRingGroup({
      ringGroupId: ringGroupId || existing.name,
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

    // Then update in DB
    const updated = await RingGroupService.update(req.params.id, {
      ringGroupId,
      strategy,
      members,
      description,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteRingGroup = async (req, res, next) => {
  try {
    const group = await RingGroupService.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Ring group not found' });

    // Remove from FreePBX first
    const isDeleted = await FreePBXService.deleteRingGroup(group.name);

    if (!isDeleted) {
      return res.status(500).json({ success: false, message: 'Failed to delete ring group from FreePBX' });
    }

    // Then delete from DB
    await RingGroupService.remove(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Ring group deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
