import { body, param } from 'express-validator';

export const validateCreateRingGroup = [
  body('strategy').notEmpty().withMessage('Strategy is required'),
  body('members').isArray({ min: 1 }).withMessage('Members must be a non-empty array'),
  body('userId').isInt({ gt: 0 }).withMessage('Valid userId is required'),
];

export const validateUpdateRingGroup = [
  param('id').isInt({ gt: 0 }).withMessage('Ring group ID must be a positive integer'),
  body('strategy').optional().notEmpty().withMessage('Strategy cannot be empty'),
  body('members').optional().isArray().withMessage('Members must be an array'),
  body('description').optional().isString(),
];

export const validateRingGroupId = [
  param('id').isInt({ gt: 0 }).withMessage('Ring group ID must be a positive integer'),
];
