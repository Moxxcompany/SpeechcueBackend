const express = require('express');
const router = express.Router();
const twilioController = require('../controllers/twilio.controller');
const { validateAvailableNumbers, validateRegions, validateSubAccountCreate, validateSubAccountSid, validatePhoneNumberPurchase, validateSid, validateUserId, validateSidParam } = require('../validators/twilio.validators');
const validate = require('../middlewares/validate');

router.get('/countries', twilioController.listCountries);

router.get('/number-types/:isoCountry', twilioController.getAvailableNumberTypes);

router.get('/countries/:isoCountry/regions', validateRegions, validate, twilioController.getCountryRegions);

router.get('/available-numbers', validateAvailableNumbers, validate, twilioController.getAvailablePhoneNumbers);

router.post('/subaccounts/create', validateSubAccountCreate, validate, twilioController.createSubAccount);

router.get('/subaccounts', twilioController.listSubAccounts);

router.post('/subaccounts/suspend', validateSubAccountSid, validate, twilioController.suspendSubAccount);

router.post('/subaccounts/reactivate', validateSubAccountSid, validate, twilioController.reactivateSubAccount);

router.post('/subaccounts/close', validateSubAccountSid, validate, twilioController.closeSubAccount);

router.post('/numbers/purchase', validatePhoneNumberPurchase, validate, twilioController.purchasePhoneNumber);

router.get('/numbers', validateUserId, validate, twilioController.listPhoneNumbers);

router.get('/numbers/:sid', validateSidParam, validate, twilioController.getPhoneNumberBySid);

router.delete('/numbers/:sid', validateSid, validate, twilioController.releasePhoneNumber);

// router.post('/assign-number', authenticate, validateAssignNumber, validate, controller.assignNumber);

// router.post('/deassign-number', authenticate, validateDeassignNumber, validate, controller.deassignNumber);


module.exports = router;
