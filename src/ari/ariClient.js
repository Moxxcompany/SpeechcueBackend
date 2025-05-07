import ari from 'ari-client';
import { getIVRFlowByPhoneNumber } from '../utils/ivrStore.js';
import { textToSpeech } from '../utils/textToSpeech.js';

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
        // client.channels.originate({
        //     endpoint: 'external_media:85.9.196.132:12345/ulaw',
        //     app: 'ivrapp',
        //     appArgs: 'externalstream'
        //   });
        client.start('ivrapp');
        console.log('✅ ARI client started and listening for calls...');
    } catch (err) {
        console.error('❌ Failed to connect to ARI:', err);
    }
}

async function runIVRFlow(client, channel, flow) {
    await channel.answer();
    console.log('Call answered, starting IVR flow...');
    let stop = false;

    // DTMF listener
    channel.on('ChannelDtmfReceived', (event) => {
      const digit = event.digit;
      if (digit === '1') {
        stop = true;
      }
    });

    // loop sound until 1 is pressed
    while (!stop) {
      await new Promise((resolve) => {
       
          
        channel.play({ media: 'sound:https://storage.googleapis.com/speechcue-ivr-audio-bucket/ivr-audio/demo-congrats.wav' }, () => {
          setTimeout(resolve, 2000); // slight delay between repeats
        });
        // channel.play({ media: 'sound:https://storage.googleapis.com/speechcue-ivr-audio-bucket/ivr-audio/tts_IVR_Testing_2_1746477640662.wav' }, () => {
        //   setTimeout(resolve, 2000); // slight delay between repeats
        // });
      });
    }

    await channel.hangup();
 

      
    const nodesMap = Object.fromEntries(flow.nodes.map(n => [n.id, n]));
    const getNextNodeId = (fromId) => {
        const edge = flow.edges.find(e => e.source === fromId);
        return edge?.target || null;
    };

    let currentNodeId = flow.nodes.find(n => n.type === 'start')?.id;
    if (!currentNodeId) {
        console.log('⚠ No start node found.');
        await channel.hangup();
        return;
    }

    while (currentNodeId) {
        const node = nodesMap[currentNodeId];
        if (!node) break;

        const { type, data } = node;

        if (type === 'start' || type === 'tts') {
            const gcsUrl = data?.audioUrl;
            if (!gcsUrl) {
                console.log(`⚠ No audioUrl for node ${node.id}, skipping...`);
                currentNodeId = getNextNodeId(currentNodeId);
                continue;
            }

            console.log(`🔊 Playing from GCS: ${gcsUrl}`);
              await channel.play({ media: `sound:${gcsUrl}` }); 
            currentNodeId = getNextNodeId(currentNodeId);
        }

        else if (type === 'input') {
            const prompt = data?.text || 'Please enter a digit.';
            const audioFile = await textToSpeech(prompt);
            // await channel.play({ media: `uri:${audioFile}` });

            try {
                const digit = await waitForDTMF(channel, data.timeout || 5);
                console.log(`🔢 Received: ${digit}`);
                currentNodeId = data.choices?.[digit] || null;
            } catch {
                const errFile = await textToSpeech('No input received. Goodbye.');
                await channel.play({ media: `uri:${errFile}` });
                await channel.hangup();
                return;
            }
        }

        else {
            console.log(`⚠ Unknown node type: ${type}`);
            break;
        }
    }

    // await channel.hangup();
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
