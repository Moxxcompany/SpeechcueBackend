import express from 'express';
import {
  createRingGroup,
  getRingGroups,
  getRingGroupById,
  updateRingGroup,
  deleteRingGroup,
} from '../controllers/ringgroup.controller.js';

const router = express.Router();

router.post('/', createRingGroup);
router.get('/', getRingGroups);
router.get('/:id', getRingGroupById);
router.put('/:id', updateRingGroup);
router.delete('/:id', deleteRingGroup);

export default router;
