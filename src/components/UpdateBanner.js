// src/components/UpdateBanner.js
import { useEffect, useState, useRef } from 'react';
import { Box, Button, Slide } from '@chakra-ui/react';

const HARD_REFRESH_KEY = 'HARD_REFRESH_IN_PROGRESS';

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [show, setShow] = useState(false);
  const reloadedRef = useRef(false);

  useEffect(() => {
    // If a hard refresh (triple-tap) just happened, skip banner once.
    const hard = sessionStorage.getItem(HARD_REFRESH_KEY);
    if (hard) {
      try { sessionStorage.removeItem(HARD_REFRESH_KEY); } catch {}
      return; // do not attach listeners for this load
    }

    let regCleanup = null;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        // If a worker is already waiting, show the banner.
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShow(true);
        }

        const onUpdateFound = () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          const onStateChange = () => {
            // Show banner only when an update is fully installed and there is a controller
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShow(true);
            }
          };
          newWorker.addEventListener('statechange', onStateChange);
        };

        reg.addEventListener('updatefound', onUpdateFound);
        regCleanup = () => reg.removeEventListener('updatefound', onUpdateFound);
      });
    }

    return () => {
      if (regCleanup) regCleanup();
    };
  }, []);

  const refreshPage = () => {
    if (!waitingWorker) return;

    // Tell the waiting worker to activate immediately
    try {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } catch {}

    // Reload exactly once when the new worker takes control
    const onControllerChange = () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, { once: true });

    // Hide the banner to avoid user re-clicks
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
      >
        <Box fontSize="sm">A new version is available.</Box>
        <Button size="sm" colorScheme="whiteAlpha" onClick={refreshPage}>
          Refresh
        </Button>
      </Box>
    </Slide>
  );
}