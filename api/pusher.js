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
      
      // Log the incoming connection
      console.log('Received connection from:', address);

      // Broadcast to all clients including sender
      await pusher.trigger('presence-tribify', 'user-connected', {
        address,
        balance,
        lastActive: 'Just now',
        timestamp: Date.now()
      });

      return res.status(200).json({ 
        success: true,
        message: 'Connection broadcast successful'
      });
    } catch (error) {
      console.error('Pusher error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
} 