import { body, param  } from 'express-validator';

export const validateAssignNumber = [
    body('phoneNumberId').isInt().withMessage('Phone number ID is required'),
    body('ivrId').isInt().withMessage('IVR ID is required'),
];

export const validateDeassignNumber = [
    body('phoneNumberId').isInt().withMessage('Phone number ID is required'),
];

export const validateGetAssignedNumbers = [
    param('userId')
      .isInt({ gt: 0 })
      .withMessage('User ID must be a positive integer'),
  ];