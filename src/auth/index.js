// src/index.js
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import App from '../App';
import theme from '../theme';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    {/* Ensure initial color mode is set (fallback to 'light' if not defined) */}
    <ColorModeScript initialColorMode={theme.config?.initialColorMode || 'light'} />
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </StrictMode>
);

// ✅ Register service worker for PWA WITHOUT auto-refresh on update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        // Listen for updates but DO NOT reload automatically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            const installed = newWorker.state === 'installed';
            const alreadyHasController = !!navigator.serviceWorker.controller;

            if (installed && alreadyHasController) {
              // A new version is available; keep current page running.
              // Optionally notify UI to show a “Refresh to update” prompt.
              console.log('PWA: update available (not auto-reloading).');
              window.dispatchEvent(new Event('pwa:update-available'));
            }
          });
        });
      })
      .catch((err) => console.error('SW registration failed:', err));
  });
}