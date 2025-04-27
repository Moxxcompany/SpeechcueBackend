import ari from 'ari-client';
import util from 'util';

export const startARIClient = async () => {
    try {
        // Enable debug logging
        const client = await ari.connect(
            'http://voice.speechcue.com:8088',
            'test',
            'Mercy@Admi12',
            { debug: true }  // ← Critical for troubleshooting
        );

        console.log('✅ ARI Connected');

        client.on('StasisStart', async (event, channel) => {
            console.log('🚀 RAW EVENT:', util.inspect(event, { depth: null }));
            
            try {
                await channel.answer();
                console.log('📞 Answered call from:', event.channel.dialplan.exten);
                
                // Immediate playback test (no DB dependencies)
                await channel.play({ media: 'sound:hello-world' });
                await channel.hangup();
            } catch (err) {
                console.error('❌ Channel error:', err);
            }
        });

        client.start('ivrapp');
        console.log('👂 Listening for Stasis events...');

    } catch (err) {
        console.error('🔥 ARI Connection Failed:', err.message);
        if (err.stack) console.error(err.stack);
    }
};