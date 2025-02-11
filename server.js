require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.BACKEND_PORT || 3001;  // Backend specific
const Pusher = require('pusher');
const { getTokenHolders } = require('./src/lib/solana');

// Enable CORS
app.use(cors());

// Middleware for JSON parsing
app.use(express.json());

// Import the message handlers
const messagesHandler = require('./src/pages/api/messages/index.js');
const messageStatusHandler = require('./src/pages/api/messages/[id].js');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Mount the routes
app.post('/api/messages', messagesHandler);
app.get('/api/messages', messagesHandler);
app.patch('/api/messages/:id', messageStatusHandler);
app.post('/api/send-message', require('./src/pages/api/send-message.js'));

app.post('/api/send-tribify', (req, res) => {
  // TODO: Add sendTribify handler
  res.status(200).json({ message: 'Send Tribify endpoint' });
});

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

app.post('/api/pusher/auth', async (req, res) => {
  const { socket_id, channel_name } = req.body;
  const { publicKey } = req.body.auth?.params || {};

  console.log('Auth request:', { socket_id, channel_name, publicKey });

  try {
    // Get current token holders
    const holders = await getTokenHolders();
    const isHolder = holders.some(h => h.address === publicKey && h.tokenBalance > 0);

    if (!isHolder) {
      console.error('Auth rejected - not a token holder:', publicKey);
      return res.status(403).json({ error: 'Only token holders can join this channel' });
    }

    // For presence channels, we MUST return user data
    if (channel_name.startsWith('presence-')) {
      const presenceData = {
        user_id: publicKey,
        user_info: {
          address: publicKey,
          tokenBalance: holders.find(h => h.address === publicKey)?.tokenBalance,
          timestamp: Date.now()
        }
      };

      console.log('Authorizing presence channel:', presenceData);
      const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
      return res.status(200).json(auth);
    }

    // For private channels
    const auth = pusher.authorizeChannel(socket_id, channel_name);
    return res.status(200).json(auth);

  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Database URL: ${process.env.DATABASE_URL}`);
}); 