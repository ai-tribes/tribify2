import { NextResponse } from 'next/server';

// Store online users in memory
const onlineUsers = new Set();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { publicKey, online } = req.body;
    
    if (online) {
      onlineUsers.add(publicKey);
    } else {
      onlineUsers.delete(publicKey);
    }

    return res.json({ users: Array.from(onlineUsers) });
  }

  if (req.method === 'GET') {
    return res.json({ users: Array.from(onlineUsers) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 