import express from 'express';
import {
  createTrunk,
  getTrunks,
  getTrunkById,
  updateTrunk,
  deleteTrunk
} from '../controllers/trunk.controller.js';

const router = express.Router();

router.post('/', createTrunk);
router.get('/', getTrunks);
router.get('/:id', getTrunkById);
router.put('/:id', updateTrunk);
router.delete('/:id', deleteTrunk);

export default router;
