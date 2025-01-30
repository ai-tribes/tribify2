import { createClient } from '@vercel/edge';
import Pusher from 'pusher';

export const config = {
  runtime: 'edge',
};

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req) {
  if (req.method === 'POST') {
    const { address, balance } = await req.json();
    
    await pusher.trigger('tribify', 'user-connected', {
      address,
      balance,
      timestamp: Date.now()
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 