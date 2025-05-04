import express from 'express';
import * as twilioController from '../controllers/twilio.controller.js';
import {
  validateAvailableNumbers,
  validateRegions,
  validateSubAccountCreate,
  validateSubAccountSid,
  validatePhoneNumberPurchase,
  validateSid,
  validateUserId,
  validateSidParam
} from '../validators/twilio.validators.js';
import validate from '../middlewares/validate.js';

const router = express.Router();

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

export default router;
