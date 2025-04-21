const crypto = require('crypto');

exports.verifyTelegramSignature = (data, botToken) => {
  const { hash, ...fields } = data;
  const sorted = Object.keys(fields)
    .sort()
    .map(k => `${k}=${fields[k]}`)
    .join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret).update(sorted).digest('hex');

  return hmac === hash;
};
