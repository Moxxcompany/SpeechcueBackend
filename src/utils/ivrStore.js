import models from '../models/index.js';

const { PhoneNumber, IVR } = models;

export async function getIVRFlowByPhoneNumber(phoneNum) {
  try {
    const phone = await PhoneNumber.findOne({
      where: { phoneNumber: phoneNum },
      include: [{
        model: IVR,
        as: 'ivr',
      }],
    });

    if (!phone || !phone.ivr) {
      console.warn(`❌ No IVR linked to phone number: ${phoneNum}`);
      return null;
    }

    console.log(`📞 Matched phone: ${phone.phoneNumber} → IVR: ${phone.ivr.name}`);
    return {
      flow: phone.ivr.flow,
      ivrDetails: {
        id: phone.ivr.id,
        name: phone.ivr.name,
        description: phone.ivr.description,
      }
    };
  } catch (err) {
    console.error(`⚠ Failed to fetch IVR flow for ${phoneNum}:`, err);
    return null;
  }
}
