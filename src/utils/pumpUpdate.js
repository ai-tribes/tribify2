export const postUpdateToPump = async (window, updateMessage) => {
  try {
    if (!window.solana) {
      throw new Error('Phantom wallet not connected');
    }

    // Use built-in TextEncoder
    const encoder = new TextEncoder();
    const message = encoder.encode(updateMessage);
    
    // Request signature from wallet
    const signature = await window.solana.signMessage(message, 'utf8');
    
    // Post to PumpPortal with signature
    const response = await fetch('https://pumpportal.fun/api/v1/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mint: '672PLqkiNdmByS6N1BQT5YPbEpkZte284huLUCxupump',
        message: updateMessage,
        signature: signature,
        wallet: window.solana.publicKey.toString(),
        source: 'tribify.ai'
      })
    });

    return response.json();
  } catch (error) {
    console.error('Failed to post update:', error);
    throw error;
  }
}; 