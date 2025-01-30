import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.REACT_APP_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.REACT_APP_PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { address, balance } = req.body;
      await pusher.trigger('tribify', 'user-connected', {
        address,
        balance,
        lastActive: 'Just now'
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
} 