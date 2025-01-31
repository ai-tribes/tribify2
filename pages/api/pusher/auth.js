import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req, res) {
  const { socket_id, channel_name } = req.body;
  const { publicKey } = req.query;

  console.log('Auth request received:', {
    socket_id,
    channel_name,
    publicKey
  });

  try {
    if (!channel_name.startsWith('presence-')) {
      console.error('Not a presence channel:', channel_name);
      return res.status(403).json({ error: 'Not a presence channel' });
    }

    if (!publicKey) {
      console.error('No public key provided');
      return res.status(403).json({ error: 'No public key provided' });
    }

    // Generate auth signature for presence channel
    const authResponse = pusher.authorizeChannel(
      socket_id,
      channel_name,
      {
        user_id: publicKey,
        user_info: {
          publicKey: publicKey,
          name: publicKey.slice(0, 4) + '...' + publicKey.slice(-4)
        }
      }
    );
    
    console.log('Auth successful:', authResponse);
    res.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(500).json({ error: 'Failed to authorize channel' });
  }
} 