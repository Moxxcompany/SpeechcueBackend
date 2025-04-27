import { Router } from 'express';
import * as ivrController from '../controllers/ivr.controller.js';

const router = Router();


router.post('/', ivrController.createIVR);
router.get('/', ivrController.getAllIVRs);
router.get('/:id', ivrController.getIVR);
router.put('/:id', ivrController.updateIVR);
router.delete('/:id', ivrController.deleteIVR);

export default router;
