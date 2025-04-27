import dotenv from 'dotenv';
dotenv.config();

export const handleIncomingCall = async (req, res, next) => {
    try {
      console.log('📞 Incoming call from Twilio:', req.body);
  
      const extension = '1001'; // Asterisk/FreePBX extension
      const serverIp = process.env.FREEPBX_IP_ADDRESS || 'https://voice.speechcue.com';
  
      const sipUri = `sip:${serverIp}:5060`;
    //   const sipUri = `sip:${extension}@${serverIp}:5060`;
  
      console.log(`🔀 Redirecting call to SIP: ${sipUri}`);
  
      res.set('Content-Type', 'text/xml');
      res.send(`
        <Response>
          <Dial>
            <Sip>${sipUri}</Sip>
          </Dial>
        </Response>
      `);
  
    } catch (error) {
      console.error('❌ Error handling incoming call:', error);
      next(error);
    }
  };
  