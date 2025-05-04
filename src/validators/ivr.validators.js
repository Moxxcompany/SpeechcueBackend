import { body } from 'express-validator';

export const validateAssignNumber = [
    body('phoneNumberId').isInt().withMessage('Phone number ID is required'),
    body('ivrId').isInt().withMessage('IVR ID is required'),
];

export const validateDeassignNumber = [
    body('phoneNumberId').isInt().withMessage('Phone number ID is required'),
];