import { Router } from 'express';
import * as ivrController from '../controllers/ivr.controller.js';
import validate from '../middlewares/validate.js';
import { validateAssignNumber, validateDeassignNumber, validateGetAssignedNumbers } from '../validators/ivr.validators.js';

const router = Router();


router.post('/', ivrController.createIVR);

router.get('/', ivrController.getAllIVRs);

router.get('/:id', ivrController.getIVR);

router.put('/:id', ivrController.updateIVR);

router.delete('/:id', ivrController.deleteIVR);

router.post('/assign-number', validateAssignNumber, validate, ivrController.assignNumberToIVR);

router.get('/assigned-numbers/:userId', validateGetAssignedNumbers, validate, ivrController.getAssignedNumbersWithIVR);

router.post('/deassign-number', validateDeassignNumber, validate, ivrController.deassignNumberFromIVR);


export default router;
