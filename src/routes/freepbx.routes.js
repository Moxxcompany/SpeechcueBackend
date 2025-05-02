import express from 'express';
import * as freePBXcontroller from '../controllers/freepbx.controller.js';

const router = express.Router();

// Create a new extension
router.post('/extensions/create', freePBXcontroller.createExtension);

// Get all extensions
router.get('/extensions', freePBXcontroller.getAllExtensions);

// Get a single extension by ID
router.get('/extensions/:id', freePBXcontroller.getExtensionById);

// Update an extension
router.put('/extensions/:id', freePBXcontroller.updateExtension);

// Delete an extension
router.delete('/extensions/:id', freePBXcontroller.deleteExtension);

export default router;
