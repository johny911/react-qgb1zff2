import { useEffect, useRef, useState } from 'react';
import { Box, Button, Slide } from '@chakra-ui/react';

const HARD_REFRESH_KEY = 'HARD_REFRESH_TS';
const SUPPRESS_MS = 15000; // suppress auto-reload for 15s after manual hard refresh

export default function UpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [show, setShow] = useState(false);
  const reloadedRef = useRef(false);

  // Skip banner once if a manual hard refresh just happened
  const hardRefreshRecently = () => {
    try {
      const ts = Number(sessionStorage.getItem(HARD_REFRESH_KEY) || 0);
      if (!ts) return false;
      return (Date.now() - ts) < SUPPRESS_MS;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (hardRefreshRecently()) return;

    let detach = () => {};

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShow(true);
      }

      const onUpdateFound = () => {
        const sw = reg.installing;
        if (!sw) return;
        const onStateChange = () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(sw);
            setShow(true);
          }
        };
        sw.addEventListener('statechange', onStateChange);
      };

      reg.addEventListener('updatefound', onUpdateFound);
      detach = () => reg.removeEventListener('updatefound', onUpdateFound);
    });

    return () => detach();
  }, []);

  const reloadOnceOnControllerChange = () => {
    if (reloadedRef.current) return;
    reloadedRef.current = true;
    const handler = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handler);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handler);
  };

  const refreshPage = () => {
    if (!waitingWorker) return;
    try { sessionStorage.setItem(HARD_REFRESH_KEY, String(Date.now())); } catch {}
    try { waitingWorker.postMessage({ type: 'SKIP_WAITING' }); } catch {}
    setShow(false);
    reloadOnceOnControllerChange();
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