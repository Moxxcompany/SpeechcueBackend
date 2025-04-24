const { query, param, body } = require('express-validator');

exports.validateAvailableNumbers = [
    query('country').notEmpty().withMessage('country is required'),
    query('type')
        .notEmpty().withMessage('type is required')
        .isIn(['local', 'mobile', 'tollFree']).withMessage('type must be local, mobile, or tollFree'),
];

exports.validateRegions = [
    param('isoCountry').notEmpty().withMessage('isoCountry is required'),
    query('type')
        .notEmpty().withMessage('type is required')
        .isIn(['local', 'mobile', 'tollFree']).withMessage('type must be local, mobile, or tollFree'),
];

exports.validateSubAccountCreate = [
    body('friendlyName')
        .notEmpty()
        .withMessage('friendlyName is required'),
    body('userId')
        .notEmpty()
        .withMessage('userId is required'),
];

exports.validateSubAccountSid = [
    body('subAccountSid')
        .notEmpty()
        .withMessage('subAccountSid is required')
];

exports.validateSidParam = [
    param('sid')
        .notEmpty()
        .withMessage('sid is required')
];

exports.validateSid = [
    body('sid')
        .notEmpty()
        .withMessage('sid is required')
];

exports.validateUserId = [
    query('userId').notEmpty().withMessage('userId is required')
]

exports.validatePhoneNumberPurchase = [
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