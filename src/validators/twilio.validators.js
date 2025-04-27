import { query, param, body } from 'express-validator';

export const validateAvailableNumbers = [
    query('country').notEmpty().withMessage('country is required'),
    query('type')
        .notEmpty().withMessage('type is required')
        .isIn(['local', 'mobile', 'tollFree']).withMessage('type must be local, mobile, or tollFree'),
];

export const validateRegions = [
    param('isoCountry').notEmpty().withMessage('isoCountry is required'),
    query('type')
        .notEmpty().withMessage('type is required')
        .isIn(['local', 'mobile', 'tollFree']).withMessage('type must be local, mobile, or tollFree'),
];

export const validateSubAccountCreate = [
    body('friendlyName')
        .notEmpty()
        .withMessage('friendlyName is required'),
    body('userId')
        .notEmpty()
        .withMessage('userId is required'),
];

export const validateSubAccountSid = [
    body('subAccountSid')
        .notEmpty()
        .withMessage('subAccountSid is required')
];

export const validateSidParam = [
    param('sid')
        .notEmpty()
        .withMessage('sid is required')
];

export const validateSid = [
    body('sid')
        .notEmpty()
        .withMessage('sid is required')
];

export const validateUserId = [
    query('userId').notEmpty().withMessage('userId is required')
]

export const validatePhoneNumberPurchase = [
    body('phoneNumber')
        .notEmpty()
        .withMessage('phoneNumber is required'),

    body('subAccountSid')
        .notEmpty()
        .isString()
        .withMessage('subAccountSid must be a string'),

    body('voiceUrl')
        .optional()
        .isURL()
        .withMessage('voiceUrl must be a valid URL'),

    body('smsUrl')
        .optional()
        .isURL()
        .withMessage('smsUrl must be a valid URL'),

    body('userId')
        .optional()
        .isInt()
        .withMessage('userId must be an integer')
];