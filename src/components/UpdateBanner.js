// src/components/UpdateBanner.js
import { useEffect, useRef, useState } from 'react';
import { Box, Button, Slide } from '@chakra-ui/react';

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [show, setShow] = useState(false);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let stopListening = () => {};

    const init = async () => {
      const reg = await navigator.serviceWorker.getRegistration();

      // If a new worker is already waiting, show the banner
      if (reg?.waiting) {
        setWaitingWorker(reg.waiting);
        setShow(true);
      }

      // Detect a newly found update
      const onUpdateFound = () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        const onStateChange = () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShow(true);
          }
        };
        newWorker.addEventListener('statechange', onStateChange);
      };

      reg?.addEventListener('updatefound', onUpdateFound);

      stopListening = () => {
        reg?.removeEventListener('updatefound', onUpdateFound);
      };
    };

    init();
    return () => stopListening();
  }, []);

  const refreshPage = async () => {
    // Reload ONCE when a new SW takes control
    const onControllerChange = () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, { once: true });

    // Ask the waiting (or installing) SW to activate immediately
    const reg = await navigator.serviceWorker.getRegistration();
    const worker = waitingWorker || reg?.waiting || reg?.installing;
    worker?.postMessage({ type: 'SKIP_WAITING' });

    // Hide the banner to avoid double clicks
    setShow(false);
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
        boxShadow="lg"
      >
        <Box fontSize="sm">A new version is available.</Box>
        <Button size="sm" colorScheme="whiteAlpha" onClick={refreshPage}>
          Refresh
        </Button>
      </Box>
    </Slide>
  );
}