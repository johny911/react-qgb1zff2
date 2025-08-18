// src/components/UpdateBanner.js
import { useEffect, useState } from 'react';
import { Box, Button, Slide } from '@chakra-ui/react';

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShow(true);
        }

        reg?.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShow(true);
            }
          });
        });
      });
    }
  }, []);

  const refreshPage = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  if (!show) return null;

  return (
    <Slide direction="up" in={show} style={{ zIndex: 1400 }}>
      <Box
        p={3}
        bg="brand.600"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box fontSize="sm">A new version is available.</Box>
        <Button size="sm" colorScheme="whiteAlpha" onClick={refreshPage}>
          Refresh
        </Button>
      </Box>
    </Slide>
  );
}