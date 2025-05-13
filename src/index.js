// src/index.js
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import App from './App';
import theme from './theme';  // 🔹 import your custom theme

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    {/* 🔹 apply the theme here */}
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </StrictMode>
);

// ✅ Register service worker for PWA with auto-refresh on update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content available, refreshing...');
                window.location.reload();
              }
            }
          };
        };
      })
      .catch((err) => console.error('SW registration failed: ', err));
  });
}