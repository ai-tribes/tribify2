const prisma = require('../../../lib/prisma');
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    // Store new message
    try {
      const { from, to, text, timestamp, encrypted } = req.body;
      
      const message = await prisma.message.create({
        data: {
          fromAddress: from,
          toAddress: to,
          content: text,
          timestamp: new Date(timestamp), // Convert timestamp to Date
          encrypted,
          delivered: false
        }
      });

      // Try to deliver via Pusher if recipient is online
      try {
        await fetch('http://localhost:3001/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, text, timestamp, encrypted })
        });
      } catch (error) {
        console.log('Recipient offline, message stored for later delivery');
      }

      res.status(200).json(message);
    } catch (error) {
      console.error('Failed to store message:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // Fetch undelivered messages for a user
    try {
      const { address } = req.query;
      
      const messages = await prisma.message.findMany({
        where: {
          toAddress: address,
          delivered: false
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      res.status(200).json(messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 