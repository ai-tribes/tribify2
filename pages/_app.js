import React, { useEffect } from 'react';
import { initializeBeams } from '../lib/pusher';

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
          // Initialize Beams after service worker is registered
          return initializeBeams();
        })
        .then(() => {
          console.log('Pusher Beams initialized');
        })
        .catch(err => {
          console.log('Error during initialization: ', err);
        });
    });
  }
}

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp; 