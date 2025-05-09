import ari from 'ari-client';
import { getIVRFlowByPhoneNumber } from '../utils/ivrStore.js';
import path from 'path';
import logger from '../config/logger.js';

export async function startARIClient() {
    try {
        const client = await ari.connect(
            'http://voice.speechcue.com:8088',
            'test',
            'test_mercy'
        );

        client.on('StasisStart', async (event, channel) => {
            try {
                const phoneNumber = channel.caller_rdnis; // Caller ID
                // console.log('Channel:', channel);
                console.log(`📞 Incoming call to number : ${phoneNumber}`);

                const flow = await getIVRFlowByPhoneNumber(phoneNumber);
                if (!flow) {
                    console.log('❌ No IVR flow found, hanging up...');
                    await channel.hangup();
                    return;
                }
                console.log('📜 IVR Flow:', flow);
                await runIVRFlow(client, channel, flow);
            } catch (err) {
                console.error('🔥 Error in StasisStart:', err);
                await channel.hangup();
            }
        });
     
        client.start('ivrapp');
        console.log('✅ ARI client started and listening for calls...');
    } catch (err) {
        console.error('❌ Failed to connect to ARI:', err);
    }
}

async function runIVRFlow(client, channel, flow) {

    const nodesMap = Object.fromEntries(flow.nodes.map(n => [n.id, n]));
    const getNextNodeId = (fromId) => {
        const edge = flow.edges.find(e => e.source === fromId);
        return edge?.target || null;
    };

    let currentNodeId = flow.nodes.find(n => n.id === '1')?.id;
    if (!currentNodeId) {
        console.log('⚠ No start node found.');
        await channel.hangup();
        return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    while (currentNodeId) {
        const node = nodesMap[currentNodeId];
        if (!node) break;
      
        const { type, data, voice } = node;
      
        switch (type) {
          case 'start':
            currentNodeId = getNextNodeId(currentNodeId);
            break;
      
          case 'answer':
            logger.info('✅ Answering call');
            await channel.answer();
            currentNodeId = getNextNodeId(currentNodeId);
            break;
      
          case 'tts': {
            const gcsUrl = data?.audioUrl;
            const urlWithoutExt = gcsUrl?.replace(path.extname(gcsUrl), '');
      
            if (!urlWithoutExt) {
              logger.warn(`⚠ Missing audio URL for node ${node.id}`);
              currentNodeId = getNextNodeId(currentNodeId);
              break;
            }
      
            const repeat = voice?.play || 1;
            logger.info(`🔊 Playing TTS: ${urlWithoutExt}, Repeat: ${repeat}`);
      
            for (let i = 0; i < repeat; i++) {
              await channel.play({ media: `sound:${urlWithoutExt}` });
            }
      
            currentNodeId = getNextNodeId(currentNodeId);
            break;
          }
      
          case 'input': {
            const retries = data.retries || 1;
            let digit = null;
            let attempts = 0;
      
            while (attempts < retries && digit === null) {
              try {
                digit = await waitForDTMF(channel, data.timeout || 5);
                logger.info(`🔢 DTMF received: ${digit}`);
              } catch {
                attempts++;
                logger.warn(`⚠ No input (Attempt ${attempts}/${retries})`);
              }
            }
      
            if (digit && data.choices?.[digit]) {
              currentNodeId = data.choices[digit];
            } else {
              logger.info('📞 No valid input received, hanging up...');
              await channel.hangup();
              return;
            }
            break;
          }
      
          case 'hangup':
            logger.info('📞 Hangup node reached. Terminating call.');
            await channel.hangup();
            currentNodeId = null;
            break;
      
          default:
            logger.warn(`⚠ Unknown node type: ${type}`);
            await channel.hangup();
            currentNodeId = null;
        }
      }
      
    
    logger.info('✅ IVR session completed.');

    console.log('✅ IVR session completed.');
}

function waitForDTMF(channel, timeoutSeconds) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            channel.removeAllListeners('ChannelDtmfReceived');
            reject(new Error('DTMF Timeout'));
        }, timeoutSeconds * 1000);

        channel.once('ChannelDtmfReceived', (event) => {
            clearTimeout(timeout);
            resolve(event.digit);
        });
    });
}
