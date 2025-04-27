import express from 'express';
import * as freePBXcontroller from '../controllers/freepbx.controller.js';

const router = express.Router();

router.post('/extensions/create', freePBXcontroller.createExtension);

export default router;
