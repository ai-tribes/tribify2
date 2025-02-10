import { box, randomBytes } from 'tweetnacl';
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { PublicKey } from '@solana/web3.js';

export const generateKeyPair = (privateKey) => {
  // Convert Solana private key to format needed by TweetNaCl
  return box.keyPair.fromSecretKey(privateKey.slice(0, 32));
};

export const getPublicKey = (privateKey) => {
  const keyPair = generateKeyPair(privateKey);
  return encodeBase64(keyPair.publicKey);
};

export const encrypt = async (message, recipientPublicKey, senderPrivateKey) => {
  const ephemeralKeyPair = box.keyPair();
  const senderKeyPair = generateKeyPair(senderPrivateKey);
  
  // Convert recipient's Solana public key to encryption public key
  const recipientPubKeyBytes = new PublicKey(recipientPublicKey).toBytes();
  
  // Generate one-time nonce
  const nonce = randomBytes(box.nonceLength);

  // Encrypt message
  const messageUint8 = decodeUTF8(message);
  const encrypted = box(
    messageUint8,
    nonce,
    recipientPubKeyBytes,
    senderKeyPair.secretKey
  );

  // Combine ephemeral public key, nonce, and encrypted message
  const fullMessage = new Uint8Array(ephemeralKeyPair.publicKey.length + nonce.length + encrypted.length);
  fullMessage.set(ephemeralKeyPair.publicKey);
  fullMessage.set(nonce, ephemeralKeyPair.publicKey.length);
  fullMessage.set(encrypted, ephemeralKeyPair.publicKey.length + nonce.length);

  return encodeBase64(fullMessage);
};

export const decrypt = async (encryptedMessage, recipientPrivateKey, senderPublicKey) => {
  const messageWithNonceAsUint8Array = decodeBase64(encryptedMessage);
  const recipientKeyPair = generateKeyPair(recipientPrivateKey);
  
  // Convert sender's Solana public key to encryption public key
  const senderPubKeyBytes = new PublicKey(senderPublicKey).toBytes();

  // Extract nonce
  const nonce = messageWithNonceAsUint8Array.slice(
    box.publicKeyLength,
    box.publicKeyLength + box.nonceLength
  );

  // Extract message
  const message = messageWithNonceAsUint8Array.slice(
    box.publicKeyLength + box.nonceLength
  );

  // Decrypt
  const decrypted = box.open(
    message,
    nonce,
    senderPubKeyBytes,
    recipientKeyPair.secretKey
  );

  if (!decrypted) {
    throw new Error('Could not decrypt message');
  }

  return encodeUTF8(decrypted);
}; 