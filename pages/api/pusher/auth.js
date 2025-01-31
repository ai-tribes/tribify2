import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: 'eu',
  useTLS: true
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { socket_id, channel_name, publicKey } = req.body;

  console.log('Auth request received:', {
    socket_id,
    channel_name,
    publicKey,
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  // Presence channels need user data
  const presenceData = {
    user_id: publicKey,
    user_info: {
      name: publicKey,
      timestamp: Date.now()
    }
  };

  try {
    if (!channel_name?.startsWith('presence-')) {
      console.error('Invalid channel:', { channel_name, type: typeof channel_name });
      return res.status(403).json({ error: 'Not a presence channel' });
    }

    if (!socket_id) {
      console.error('No socket ID provided');
      return res.status(403).json({ error: 'No socket ID provided' });
    }

    if (!publicKey) {
      console.error('No public key provided');
      return res.status(403).json({ error: 'No public key provided' });
    }

    console.log('Authorizing channel with data:', { presenceData });
    const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
    console.log('Auth successful:', auth);
    
    res.json(auth);
  } catch (error) {
    console.error('Pusher auth error:', {
      error,
      stack: error.stack,
      socketId: socket_id,
      channelName: channel_name,
      publicKey
    });
    res.status(500).json({ error: error.message });
  }
} 