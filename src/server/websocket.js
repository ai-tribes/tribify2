const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

// Store connected clients and their messages
const clients = new Map();
const messageHistory = new Map();

server.on('connection', (ws) => {
  let userPublicKey = null;

  ws.on('message', (data) => {
    const message = JSON.parse(data);

    if (message.type === 'register') {
      // Register new user
      userPublicKey = message.publicKey;
      clients.set(userPublicKey, ws);
      
      // Send any pending messages
      const pending = messageHistory.get(userPublicKey) || [];
      pending.forEach(msg => ws.send(JSON.stringify(msg)));
      
    } else if (message.type === 'message') {
      // Store message
      const recipientHistory = messageHistory.get(message.to) || [];
      messageHistory.set(message.to, [...recipientHistory, message]);

      // Send to recipient if online
      const recipientWs = clients.get(message.to);
      if (recipientWs) {
        recipientWs.send(JSON.stringify(message));
      }
    }
  });

  ws.on('close', () => {
    if (userPublicKey) {
      clients.delete(userPublicKey);
    }
  });
});

console.log('WebSocket server running on port 8080'); 