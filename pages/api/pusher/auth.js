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

  // Enhanced logging
  console.log('Auth request:', {
    socket_id,
    channel_name,
    publicKey,
    timestamp: new Date().toISOString()
  });

  try {
    // Validate presence channel
    if (!channel_name?.startsWith('presence-')) {
      throw new Error('Invalid channel type - must be presence channel');
    }

    // Validate required params
    if (!socket_id || !publicKey) {
      throw new Error('Missing required parameters');
    }

    // Create presence data
    const presenceData = {
      user_id: publicKey,
      user_info: {
        publicKey: publicKey,
        connectedAt: Date.now()
      }
    };

    // Generate auth response
    const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
    
    console.log('Auth successful:', {
      publicKey,
      channel: channel_name,
      timestamp: new Date().toISOString()
    });

    res.status(200).json(auth);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: error.message });
  }
} 