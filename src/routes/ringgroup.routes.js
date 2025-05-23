import express from 'express';
import {
  createRingGroup,
  getRingGroups,
  getRingGroupById,
  updateRingGroup,
  deleteRingGroup,
} from '../controllers/ringgroup.controller.js';

import {
  validateCreateRingGroup,
  validateUpdateRingGroup,
  validateRingGroupId,
} from '../validators/ringgroup.validation.js';

import validate from '../middlewares/validate.js'; // your general error-checking middleware

const router = express.Router();

router.post('/', validateCreateRingGroup, validate, createRingGroup);
router.get('/', getRingGroups);
router.get('/:id', validateRingGroupId, validate, getRingGroupById);
router.put('/:id', validateUpdateRingGroup, validate, updateRingGroup);
router.delete('/:id', validateRingGroupId, validate, deleteRingGroup);

export default router;
