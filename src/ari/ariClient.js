import ari from 'ari-client';
import { getIVRFlowByPhoneNumber } from '../utils/ivrStore.js'; 
// import { textToSpeech } from '../utils/tts.js';

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
        console.log('Channel:', channel);
        console.log(`📞 Incoming call to number ${phoneNumber}`);

        const flow = await getIVRFlowByPhoneNumber(phoneNumber);
        if (!flow) {
          console.log('❌ No IVR flow found, hanging up...');
          await channel.hangup();
          return;
        }

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
  let nodeId = flow.startNodeId;

  while (nodeId) {
    const node = flow.nodes[nodeId];
    if (!node) break;

    if (node.type === 'playback') {
      const audioFile = await textToSpeech(node.text);
      await channel.play({ media: `sound:${audioFile}` });
      nodeId = node.next;
    } else if (node.type === 'input') {
      try {
        const digit = await waitForDTMF(channel, node.timeout || 5);
        console.log(`🔢 Input received: ${digit}`);
        nodeId = node.choices?.[digit] || null;
      } catch {
        console.log('⌛ No input. Hanging up.');
        await channel.hangup();
        return;
      }
    } else if (node.type === 'transfer') {
      await channel.continueInDialplan();
      return;
    } else {
      console.log(`⚠ Unknown node type: ${node.type}`);
      nodeId = null;
    }
  }

  await channel.hangup();
  console.log('✅ IVR session completed.');
}

function waitForDTMF(channel, timeoutSeconds) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.removeAllListeners('ChannelDtmfReceived');
      reject();
    }, timeoutSeconds * 1000);

    channel.once('ChannelDtmfReceived', (event) => {
      clearTimeout(timeout);
      resolve(event.digit);
    });
  });
}
