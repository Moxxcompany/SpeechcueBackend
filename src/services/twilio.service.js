import twilio from 'twilio';
import client from '../config/twilio.js';
import logger from '../config/logger.js';
import { decrypt, encrypt } from '../utils/encryption.js';
import models from '../models/index.js';

const {
    sequelize,
    User,
    SubAccount,
    PhoneNumber,
    SipDomain,
    SipCredential
} = models;

/**
 * Fetch country list available for phone number provisioning
 */
export const fetchCountryList = async () => {
    try {
        const result = await client.pricing.v1.phoneNumbers.countries.list();

        logger.info(`Fetched ${result.length} countries from Twilio`);

        return result.map(country => ({
            country: country.country,
            isoCountry: country.isoCountry,
            priceUnit: country.priceUnit
        }));
    } catch (err) {
        logger.error('Failed to fetch country list from Twilio:', err.message);
        throw err;
    }
};

export const getAvailableNumberTypes = async (isoCountry) => {
    const types = [];

    // Try Local
    try {
        const local = await client.availablePhoneNumbers(isoCountry).local.list({ limit: 1 });
        if (local.length > 0) types.push('local');
        console.log('local', local);
    } catch (err) {
        logger.warn(`Local not available for ${isoCountry}: ${err.message}`);
    }

    // Try Mobile
    try {
        const mobile = await client.availablePhoneNumbers(isoCountry).mobile.list({ limit: 1 });
        if (mobile.length > 0) types.push('mobile');
        console.log('mobile', mobile);
    } catch (err) {
        logger.warn(`Mobile not available for ${isoCountry}: ${err.message}`);
    }

    // Try Toll-Free
    try {
        const tollFree = await client.availablePhoneNumbers(isoCountry).tollFree.list({ limit: 1 });
        if (tollFree.length > 0) types.push('tollFree');
        console.log('tollFree', tollFree);
    } catch (err) {
        logger.warn(`TollFree not available for ${isoCountry}: ${err.message}`);
    }

    return types.map((type) => ({ key: type, value: type }));
};


export const getRegionsByType = async ({ isoCountry, type, page = 1, limit = 20 }) => {
    try {
        const options = { limit: 1000 };

        let numbers;

        switch (type) {
            case 'local':
                numbers = await client.availablePhoneNumbers(isoCountry).local.list(options);
                break;

            case 'mobile':
                numbers = await client.availablePhoneNumbers(isoCountry).mobile.list(options);
                break;

            case 'tollFree':
                numbers = await client.availablePhoneNumbers(isoCountry).tollFree.list(options);
                break;

            default:
                throw new Error('Invalid number type. Must be local, mobile, or tollFree.');
        }
        console.log('numbers', numbers);

        const regions = numbers
            .map(num => ({
                locality: num.locality,
                region: num.region,
                isoCountry: num.isoCountry
            }))
            .filter(item => item.locality && item.region);

        // Deduplicate
        const unique = Array.from(new Map(
            regions.map(item => [`${item.locality}-${item.region}`, item])
        ).values());

        const total = unique.length;
        const offset = (page - 1) * limit;
        const paginated = unique.slice(offset, offset + limit);

        return {
            data: paginated,
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit)
        };
    } catch (err) {
        logger.error(`Error fetching ${type} regions for ${isoCountry}: ${err.message}`);
        throw err;
    }
};

export const searchAvailableNumbers = async ({ country, type, region, locality, limit = 20 }) => {
    try {
        const options = { limit: parseInt(limit) };

        if (region) options.inRegion = region;
        if (locality) options.inLocality = locality;

        let numbers;

        switch (type) {
            case 'local':
                numbers = await (await client.availablePhoneNumbers(country)).local.list(options);
                break;

            case 'mobile':
                numbers = await (await client.availablePhoneNumbers(country)).mobile.list(options);
                break;

            case 'tollFree':
                numbers = await (await client.availablePhoneNumbers(country)).tollFree.list(options);
                break;

            default:
                throw new Error('Invalid number type. Must be local, mobile, or tollFree.');
        }

        logger.info(`Fetched ${numbers.length} ${type} numbers for ${country}`);
        return numbers;
    } catch (err) {
        logger.error(`Number search failed: ${err.message}`);
        return [];
    }
};

// export const createSubAccount = async (friendlyName, userId) => {
//     try {
//         const subAccount = await client.api.accounts.create({ friendlyName });

//         logger.info(`Created Twilio subaccount: ${subAccount.sid}`);

//         // For Register: const subAccount = await createSubAccount(`User-${user.id}-${user.name}`, user.id);

//         await SubAccount.create({
//             sid: subAccount.sid,
//             friendlyName: subAccount.friendlyName,
//             authToken: subAccount.authToken,
//             status: subAccount.status,
//             dateCreated: subAccount.dateCreated,
//             userId
//         });

//         return {
//             sid: subAccount.sid,
//             authToken: subAccount.authToken,
//             status: subAccount.status,
//             dateCreated: subAccount.dateCreated,
//         };
//     } catch (error) {
//         logger.error(`Failed to create subaccount: ${error.message}`);
//         throw error;
//     }
// };

export const createFullSubAccount = async (friendlyName, userId) => {
    const created = {};
    const transaction = await sequelize.transaction();

    try {
        logger.info(`🟢 Starting full subaccount setup for userId=${userId}`);

        // Step 1: Create Twilio SubAccount
        const sub = await client.api.accounts.create({ friendlyName });
        created.subAccountSid = sub.sid;
        created.subAccountToken = sub.authToken;
        logger.info(`✅ SubAccount created: ${sub.sid}`);

        await SubAccount.create({
            sid: sub.sid,
            friendlyName,
            authToken: encrypt(sub.authToken), // 🔐 encrypted
            status: sub.status,
            dateCreated: sub.dateCreated,
            userId
        }, { transaction });

        const subClient = twilio(sub.sid, sub.authToken);

        // Step 2: Create SIP Domain
        const domain = await subClient.sip.domains.create({
            domainName: `sip-${userId}-${Date.now()}.sip.twilio.com`,
            friendlyName: `SIP-${friendlyName}`,
            voiceUrl: 'https://backend.com/handlezcall'
        });
        created.domainSid = domain.sid;
        logger.info(`✅ SIP Domain created: ${domain.domainName} (${domain.sid})`);

        await SipDomain.create({
            domainSid: domain.sid,
            domainName: domain.domainName,
            voiceUrl: domain.voiceUrl,
            subAccountSid: sub.sid,
            userId
        }, { transaction });

        // Step 3: Create SIP Credentials
        const credList = await subClient.sip.credentialLists.create({
            friendlyName: `CredList-${userId}`
        });
        created.credListSid = credList.sid;
        logger.info(`✅ SIP Credential List created: ${credList.sid}`);

        const username = `sipuser-${userId}`;
        const password = Math.random().toString(36).slice(2) + '!Pwd';

        const credential = await subClient
            .sip.credentialLists(credList.sid)
            .credentials
            .create({ username, password });
        logger.info(`✅ SIP Credential created: username=${username}`);
            
        await subClient
            .sip.domains(domain.sid)
            .credentialListMappings
            .create({ credentialListSid: credList.sid });
        logger.info(`✅ Credential List mapped to domain`);

        await SipCredential.create({
            credentialListSid: credList.sid,
            username,
            password: encrypt(password), // 🔐 encrypted
            subAccountSid: sub.sid,
            userId
        }, { transaction });

        await transaction.commit();
        logger.info(`🎉 Setup complete. Committed transaction for userId=${userId}`);

        return {
            subAccountSid: sub.sid,
            domainName: domain.domainName,
            sipUsername: username,
            // sipPassword: password 
        };
    } catch (err) {
        logger.warn(`⚠️ Error occurred. Rolling back transaction for userId=${userId}: ${err.message}`);
        await transaction.rollback();

        try {
            const rollbackClient = created.subAccountSid
                ? twilio(created.subAccountSid, created.subAccountToken)
                : null;

            if (rollbackClient && created.domainSid) {
                await rollbackClient.sip.domains(created.domainSid).remove();
                logger.info(`🗑 Rolled back SIP domain: ${created.domainSid}`);
            }

            if (rollbackClient && created.credListSid) {
                await rollbackClient.sip.credentialLists(created.credListSid).remove();
                logger.info(`🗑 Rolled back credential list: ${created.credListSid}`);
            }

            if (created.subAccountSid) {
                await client.api.accounts(created.subAccountSid).update({ status: 'closed' });
                logger.info(`🛑 Closed SubAccount: ${created.subAccountSid}`);
            }
        } catch (rollbackErr) {
            logger.error(`🔥 Rollback failed: ${rollbackErr.message}`);
        }

        throw new Error(`❌ Failed to create SubAccount + SIP. Rolled back. Reason: ${err.message}`);
    }
};

export const listSubAccounts = async () => {
    try {
        const accounts = await client.api.accounts.list({ limit: 50 }); // Adjust limit if needed

        logger.info(`Fetched ${accounts.length} subaccounts`);

        return accounts.map(acc => ({
            sid: acc.sid,
            friendlyName: acc.friendlyName,
            status: acc.status,
            dateCreated: acc.dateCreated,
            dateUpdated: acc.dateUpdated,
        }));
    } catch (error) {
        logger.error(`Failed to list subaccounts: ${error.message}`);
        throw error;
    }
};

export const suspendSubAccount = async (sid) => {
    try {
        const result = await client.api.accounts(sid).update({ status: 'suspended' });
        logger.info(`Suspended Twilio subaccount: ${sid}`);

        return {
            sid: result.sid,
            status: result.status,
            dateUpdated: result.dateUpdated,
        };
    } catch (err) {
        logger.error(`Failed to suspend subaccount ${sid}: ${err.message}`);
        throw err;
    }
};

export const reactivateSubAccount = async (sid) => {
    try {
        const result = await client.api.accounts(sid).update({ status: "active" });
        logger.info(`Reactivated Twilio subaccount: ${sid}`);

        return {
            sid: result.sid,
            status: result.status,
            dateUpdated: result.dateUpdated,
        };
    } catch (err) {
        logger.error(`Failed to reactivate subaccount ${sid}: ${err.message}`);
        throw err;
    }
};

export const closeSubAccount = async (sid) => {
    try {
        const result = await client.api.accounts(sid).update({ status: 'closed' });
        logger.info(`Closed Twilio subaccount: ${sid}`);

        // Optional: sync to your DB
        const sub = await SubAccount.findOne({ where: { sid } });
        if (sub) {
            sub.status = 'closed';
            await sub.save();
        }

        return {
            sid: result.sid,
            status: result.status,
            dateUpdated: result.dateUpdated,
        };
    } catch (err) {
        logger.error(`Failed to close subaccount ${sid}: ${err.message}`);
        throw err;
    }
};

export const purchasePhoneNumber = async ({ phoneNumber, subAccountSid, voiceUrl, smsUrl, userId, addressSid }) => {
    try {
      const isTest = process.env.TWILIO_ENV === 'test';
  
      let accountSid, authToken;
  
      if (isTest) {
        accountSid = process.env.TWILIO_TEST_ACCOUNT_SID;
        authToken = process.env.TWILIO_TEST_AUTH_TOKEN;
      } else {
        const subAccount = await SubAccount.findOne({ where: { sid: subAccountSid } });
  
        if (!subAccount) {
          throw new Error('SubAccount not found');
        }
  
        accountSid = subAccount.sid;
        authToken = decrypt(subAccount.authToken);
      }
  
      const client = twilio(accountSid, authToken);
  
      const options = { phoneNumber };
      if (voiceUrl) options.voiceUrl = voiceUrl;
      if (smsUrl) options.smsUrl = smsUrl;
      if (addressSid) options.addressSid = addressSid; // 🔥 Add AddressSid support
  
      const purchased = await client.incomingPhoneNumbers.create(options);
  
      await PhoneNumber.create({
        phoneNumber: purchased?.phoneNumber,
        friendlyName: purchased?.friendlyName,
        isoCountry: purchased?.isoCountry,
        capabilities: purchased?.capabilities,
        voiceUrl,
        smsUrl,
        userId,
        subAccountSid,
        sid: purchased.sid
      });
  
      return {
        sid: purchased.sid,
        phoneNumber: purchased.phoneNumber,
        friendlyName: purchased.friendlyName,
        isoCountry: purchased.isoCountry,
        capabilities: purchased.capabilities
      };
  
    } catch (err) {
      console.error('❌ Error purchasing phone number:', err);
      throw new Error(`Failed to purchase number: ${err.message}`);
    }
  };
  
export const listPhoneNumbers = async (userId) => {
    const where = userId ? { userId } : {};
    return await PhoneNumber.findAll({ where });
};

export const getPhoneNumberBySid = async (sid) => {
    return await PhoneNumber.findOne({ where: { sid } });
};

export const releasePhoneNumber = async (sid) => {
    const number = await client.incomingPhoneNumbers(sid).remove();

    // delete from DB 
    await PhoneNumber.destroy({ where: { sid } });

    return number;
};

export const assignPhoneNumberToSip = async ({ phoneSid, sipUsername, sipDomain }) => {
    try {
        const sipUri = `sip:${sipUsername}@${sipDomain}`;

        const updated = await client.incomingPhoneNumbers(phoneSid).update({
            voiceUrl: sipUri,
            voiceMethod: 'POST'
        });

        logger.info(`📞 Assigned phone number ${updated.phoneNumber} to SIP URI: ${sipUri}`);
        return updated;
    } catch (err) {
        logger.error(`❌ Failed to assign phone number to SIP URI: ${err.message}`);
        throw err;
    }
};

export const deassignPhoneNumber = async (phoneSid) => {
    try {
        const updated = await client.incomingPhoneNumbers(phoneSid).update({
            voiceUrl: '',
            voiceMethod: 'POST'
        });

        logger.info(`🗑 Deassigned SIP URI from phone number ${updated.phoneNumber}`);
        return updated;
    } catch (err) {
        logger.error(`❌ Failed to deassign phone number: ${err.message}`);
        throw err;
    }
};