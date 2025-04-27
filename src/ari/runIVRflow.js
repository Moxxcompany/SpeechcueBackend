export async function runIVRFlow(channel, flow) {
    const client = channel._client;
    const nodeMap = new Map();
    const edgeMap = new Map();
  
    flow.nodes.forEach(n => nodeMap.set(n.id, n));
    flow.edges.forEach(e => {
      if (!edgeMap.has(e.source)) edgeMap.set(e.source, []);
      edgeMap.get(e.source).push(e);
    });
  
    let current = flow.nodes.find(n => n.type === 'start');
    while (current) {
      if (current.type === 'audio') {
        const file = current.data.prompt?.replace(/\.(mp3|wav)$/, '');
        const playback = client.Playback();
        await channel.play({ media: `sound:${file}` }, playback);
      }
  
      if (current.type === 'gather') {
        const digit = await waitForDTMF(channel);
        const match = edgeMap.get(current.id)?.find(e => e.label === `Press ${digit}`);
        current = match ? nodeMap.get(match.target) : null;
        continue;
      }
  
      if (current.type === 'hangup') {
        await channel.hangup();
        return;
      }
  
      const next = edgeMap.get(current.id)?.[0];
      current = next ? nodeMap.get(next.target) : null;
    }
    await channel.hangup();
  }
  