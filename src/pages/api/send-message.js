const Pusher = require('pusher');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { from, to, text, timestamp, encrypted } = req.body;

      await pusher.trigger('presence-tribify', 'client-message', {
        from,
        to,
        text,
        timestamp,
        encrypted
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to send message:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}; 