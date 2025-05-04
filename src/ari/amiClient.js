import AmiClient from "asterisk-ami-client";

let client = new AmiClient({
  reconnect: true,
  keepAlive: true,
  emitEventsByTypes: true,
  emitResponsesById: true
});

client
  .connect('nodejs_user', 'e700b9f2663594c810716d13a5ce85cd860f66b3', { host: 'http://85.9.196.132', port: 5038 })     // connect to your AMI remotely
  .then(() => {
    client
      .on('Dial', event => console.log(event))
      .on('Hangup', event => console.log(event))
      .on('Hold', event => console.log(event))
      .on('Bridge', event => console.log(event))
      .on('resp_123', response => {
        console.log(response);
        client.disconnect();
      })
      .on('internalError', error => console.log(error));

    client.action({
      Action: 'Ping',
      ActionID: 123
    });
  })
  .catch(error => console.log(error));