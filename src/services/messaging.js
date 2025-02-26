import Pusher from 'pusher-js';
import { encrypt, decrypt } from '../lib/encryption';

/**
 * Initialize Pusher client for real-time messaging
 * 
 * @param {string} publicKey - The user's public key
 * @returns {Pusher} Pusher client instance
 */
export const initializePusher = (publicKey) => {
  if (!publicKey) return null;

  const pusherClient = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
    cluster: process.env.REACT_APP_PUSHER_CLUSTER,
    authEndpoint: process.env.NODE_ENV === 'production'
      ? 'https://tribify-richardboase-ai-tribes.vercel.app/api/pusher/auth'
      : 'http://localhost:3001/api/pusher/auth',
    auth: {
      headers: { 'Content-Type': 'application/json' },
      params: { publicKey }
    }
  });

  return pusherClient;
};

/**
 * Subscribe to the main Tribify presence channel
 * 
 * @param {Pusher} pusherClient - Pusher client instance
 * @param {Function} onMembersUpdate - Callback for member updates
 * @param {Function} onMessageReceived - Callback for message reception
 * @returns {Object} Channel subscription
 */
export const subscribeToPusherChannel = (pusherClient, onMembersUpdate, onMessageReceived) => {
  if (!pusherClient) return null;

  const channel = pusherClient.subscribe('presence-tribify');
  
  // Handle subscription success
  channel.bind('pusher:subscription_succeeded', (members) => {
    console.log('Subscription succeeded:', members);
    
    // Convert members to a Set of online users
    const online = new Set();
    members.each(member => online.add(member.id));
    
    if (onMembersUpdate) {
      onMembersUpdate(online);
    }
  });
  
  // Handle member additions
  channel.bind('pusher:member_added', (member) => {
    if (onMembersUpdate) {
      onMembersUpdate((prev) => new Set([...prev, member.id]));
    }
  });
  
  // Handle member removals
  channel.bind('pusher:member_removed', (member) => {
    if (onMembersUpdate) {
      onMembersUpdate((prev) => {
        const updated = new Set([...prev]);
        updated.delete(member.id);
        return updated;
      });
    }
  });
  
  // Handle private messages
  channel.bind('client-private-message', (data) => {
    if (onMessageReceived) {
      onMessageReceived(data);
    }
  });
  
  return channel;
};

/**
 * Send a message to another user
 * 
 * @param {Object} channel - Pusher channel
 * @param {string} recipientAddress - Recipient's address
 * @param {string} senderAddress - Sender's address
 * @param {string} message - Message text
 * @param {string} password - Encryption password
 * @returns {boolean} Success status
 */
export const sendMessage = (channel, recipientAddress, senderAddress, message, password) => {
  try {
    if (!channel) {
      console.error('No channel available for sending message');
      return false;
    }
    
    const timestamp = new Date().toISOString();
    
    // Encrypt message if password is provided
    const encryptedContent = password 
      ? encrypt(message, password)
      : message;
    
    // Prepare message data
    const messageData = {
      sender: senderAddress,
      recipient: recipientAddress,
      content: encryptedContent,
      isEncrypted: !!password,
      timestamp,
      id: `${senderAddress}-${timestamp}`
    };
    
    // Trigger the message event to the recipient
    const sent = channel.trigger('client-private-message', messageData);
    
    return sent;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
};

/**
 * Process an incoming message
 * 
 * @param {Object} message - Message data
 * @param {Object} messages - Current messages state
 * @param {string} password - Decryption password
 * @returns {Object} Updated messages state
 */
export const processIncomingMessage = (message, messages, password) => {
  const { sender, content, isEncrypted, timestamp, id } = message;
  
  // Decrypt message if it's encrypted and we have a password
  const decryptedContent = (isEncrypted && password) 
    ? decrypt(content, password)
    : content;
  
  // Create new message object
  const newMessage = {
    id,
    sender,
    content: decryptedContent,
    timestamp,
    isDecrypted: isEncrypted ? !!password : true
  };
  
  // Add to messages store
  const updatedMessages = { ...messages };
  
  if (!updatedMessages[sender]) {
    updatedMessages[sender] = [];
  }
  
  // Add message if it doesn't already exist
  if (!updatedMessages[sender].some(msg => msg.id === id)) {
    updatedMessages[sender] = [
      ...updatedMessages[sender],
      newMessage
    ];
  }
  
  return updatedMessages;
};

/**
 * Update unread message counts
 * 
 * @param {string} sender - Message sender
 * @param {Object} unreadCounts - Current unread count state
 * @returns {Object} Updated unread counts
 */
export const updateUnreadCount = (sender, unreadCounts) => {
  return {
    ...unreadCounts,
    [sender]: (unreadCounts[sender] || 0) + 1
  };
};

/**
 * Reset unread count for a specific sender
 * 
 * @param {string} sender - Message sender
 * @param {Object} unreadCounts - Current unread count state
 * @returns {Object} Updated unread counts
 */
export const resetUnreadCount = (sender, unreadCounts) => {
  const updatedCounts = { ...unreadCounts };
  updatedCounts[sender] = 0;
  return updatedCounts;
};

/**
 * Get total unread message count
 * 
 * @param {Object} unreadCounts - Unread counts by sender
 * @returns {number} Total unread count
 */
export const getTotalUnreadCount = (unreadCounts) => {
  return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
}; 