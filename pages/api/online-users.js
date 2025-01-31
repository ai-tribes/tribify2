// Store online users in memory (or use Redis in production)
const onlineUsers = new Map();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST = user coming online
  if (req.method === 'POST') {
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ error: 'No public key provided' });
    }

    // Add user with timestamp
    onlineUsers.set(publicKey, Date.now());
    console.log('User online:', publicKey);
    
    return res.json({ 
      message: 'Online status updated',
      onlineUsers: Array.from(onlineUsers.keys())
    });
  }

  // GET = fetch online users
  if (req.method === 'GET') {
    // Clean up users who haven't pinged in 30 seconds
    const now = Date.now();
    for (const [key, timestamp] of onlineUsers) {
      if (now - timestamp > 30000) {
        onlineUsers.delete(key);
        console.log('User timed out:', key);
      }
    }

    return res.json({
      onlineUsers: Array.from(onlineUsers.keys())
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
} 