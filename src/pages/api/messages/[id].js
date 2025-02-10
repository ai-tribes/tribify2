const prisma = require('../../../lib/prisma');

module.exports = async function handler(req, res) {
  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const { delivered } = req.body;

      const message = await prisma.message.update({
        where: { id },
        data: { delivered }
      });

      res.status(200).json(message);
    } catch (error) {
      console.error('Failed to update message:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}; 