import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req, res) {
  const { socket_id, channel_name, user_info } = req.body;

  try {
    const authResponse = pusher.authorizeChannel(
      socket_id,
      channel_name,
      {
        user_id: user_info.id,
        user_info: user_info
      }
    );
    res.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(500).json({ error: 'Failed to authorize channel' });
  }
} 