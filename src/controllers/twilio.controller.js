const twilioService = require('../services/twilio.service');
const logger = require('../config/logger');

exports.listCountries = async (req, res, next) => {
    try {
        const countries = await twilioService.fetchCountryList();
        res.status(200).json(countries);
    } catch (error) {
        logger.error(`List countries failed: ${error.message}`);
        next(error);
    }
};

exports.getAvailableNumberTypes = async (req, res, next) => {
    const { isoCountry } = req.params;

    try {
        const types = await twilioService.getAvailableNumberTypes(isoCountry);
        res.status(200).json({ types });
    } catch (error) {
        logger.error(`Failed to fetch number types for ${isoCountry}: ${error.message}`);
        next(error);
    }
};

exports.getCountryRegions = async (req, res, next) => {
    const { isoCountry } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    try {
        const result = await twilioService.getRegionsByType({ isoCountry, type, page, limit });
        res.status(200).json(result);
    } catch (error) {
        logger.error(`Failed to fetch regions for ${isoCountry} - ${type}: ${error.message}`);
        next(error);
    }
};


exports.getAvailablePhoneNumbers = async (req, res, next) => {
    const { country, type, region, locality, limit } = req.query;

    try {
        const numbers = await twilioService.searchAvailableNumbers({
            country,
            type,
            region,
            locality,
            limit
        });

        res.status(200).json(numbers);
    } catch (error) {
        logger.error(`Failed to fetch available numbers: ${error.message}`);
        next(error);
    }
};

exports.createSubAccount = async (req, res, next) => {
    const { friendlyName, userId } = req.body;

    try {
        const subAccount = await twilioService.createSubAccount(friendlyName, userId);
        res.status(201).json(subAccount);
    } catch (error) {
        next(error);
    }
};

exports.listSubAccounts = async (req, res, next) => {
    try {
        const accounts = await twilioService.listSubAccounts();
        res.status(200).json(accounts);
    } catch (error) {
        next(error);
    }
};


exports.suspendSubAccount = async (req, res, next) => {
    const { subAccountSid } = req.body;

    if (!subAccountSid) {
        return res.status(400).json({ error: 'subAccountSid is required' });
    }

    try {
        const result = await twilioService.suspendSubAccount(subAccountSid);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

exports.reactivateSubAccount = async (req, res, next) => {
    const { subAccountSid } = req.body;

    try {
        const result = await twilioService.reactivateSubAccount(subAccountSid);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

exports.closeSubAccount = async (req, res, next) => {
    const { subAccountSid } = req.body;

    try {
        const result = await twilioService.closeSubAccount(subAccountSid);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

exports.purchasePhoneNumber = async (req, res, next) => {
    const { phoneNumber, subAccountSid, voiceUrl, smsUrl, userId } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ error: 'phoneNumber is required' });
    }

    try {
        const result = await twilioService.purchasePhoneNumber({
            phoneNumber,
            subAccountSid,
            voiceUrl,
            smsUrl,
            userId
        });

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

exports.listPhoneNumbers = async (req, res, next) => {
    try {
        const numbers = await twilioService.listPhoneNumbers(req.query.userId); // optional filter
        res.status(200).json(numbers);
    } catch (err) {
        next(err);
    }
};

exports.getPhoneNumberBySid = async (req, res, next) => {
    const { sid } = req.params;

    try {
        const number = await twilioService.getPhoneNumberBySid(sid);
        if (!number) {
            return res.status(404).json({ error: 'Phone number not found' });
        }

        res.status(200).json(number);
    } catch (err) {
        next(err);
    }
};


exports.releasePhoneNumber = async (req, res, next) => {
    const { sid } = req.params;

    try {
        await twilioService.releasePhoneNumber(sid);
        res.json({ message: 'Number released' });
    } catch (err) {
        next(err);
    }
};

exports.assignNumber = async (req, res, next) => {
    try {
        const { phoneSid, sipUsername, sipDomain } = req.body;
        const result = await twilioService.assignPhoneNumberToSip({ phoneSid, sipUsername, sipDomain });

        res.status(200).json({
            message: 'Phone number assigned to SIP domain',
            phoneNumber: result.phoneNumber,
            voiceUrl: result.voiceUrl
        });
    } catch (err) {
        next(err);
    }
};

exports.deassignNumber = async (req, res, next) => {
    try {
        const { phoneSid } = req.body;
        const result = await twilioService.deassignPhoneNumber(phoneSid);

        res.status(200).json({
            message: 'Phone number deassigned',
            phoneNumber: result.phoneNumber
        });
    } catch (err) {
        next(err);
    }
};