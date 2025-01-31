import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req, res) {
  const webhookSignature = req.headers['x-pusher-signature'];
  const body = req.body;

  console.log('Webhook received:', {
    headers: req.headers,
    body: body
  });

  try {
    // Verify webhook signature
    const isValid = pusher.webhook({
      headers: req.headers,
      rawBody: JSON.stringify(body)
    });

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // Handle different webhook events
    if (body.events) {
      body.events.forEach(event => {
        switch (event.name) {
          // Cache events
          case 'cache_miss':
            console.log('Cache miss:', event.channel);
            break;

          // Channel events
          case 'channel_occupied':
            console.log('Channel occupied:', event.channel);
            break;
          case 'channel_vacated':
            console.log('Channel vacated:', event.channel);
            break;

          // Client events
          case 'client_event':
            console.log('Client event:', {
              channel: event.channel,
              event: event.event,
              data: event.data
            });
            break;

          // Presence events
          case 'member_added':
            console.log('Member added:', {
              channel: event.channel,
              user_id: event.user_id
            });
            break;
          case 'member_removed':
            console.log('Member removed:', {
              channel: event.channel,
              user_id: event.user_id
            });
            break;

          default:
            console.log('Unknown event:', event);
        }
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
} 