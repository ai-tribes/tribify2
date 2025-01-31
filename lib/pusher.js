import Pusher from 'pusher-js';

// Initialize Pusher client
const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: 'eu',
  authEndpoint: '/api/pusher/auth',
  auth: {
    params: {
      // This will be set when connecting
      publicKey: null
    }
  }
});

// Create a function to connect with the user's public key
export const connectPusher = (publicKey) => {
  // Update auth params with user's public key
  pusher.config.auth.params.publicKey = publicKey;
  
  // Subscribe to the presence channel
  const channel = pusher.subscribe('presence-tribify');
  
  // Handle presence events
  channel.bind('pusher:subscription_succeeded', (members) => {
    console.log('Successfully subscribed!', members);
  });

  channel.bind('pusher:member_added', (member) => {
    console.log('Member added:', member);
  });

  channel.bind('pusher:member_removed', (member) => {
    console.log('Member removed:', member);
  });

  // Handle custom message events
  channel.bind('client-message', (data) => {
    console.log('Received message:', data);
  });

  return channel;
};

export const sendMessage = (channel, message, recipient) => {
  channel.trigger('client-message', {
    text: message,
    from: pusher.config.auth.params.publicKey,
    to: recipient,
    timestamp: Date.now()
  });
};

export default pusher; 