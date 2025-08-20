import React, { useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { BUILD_VERSION } from '../version';

const HARD_REFRESH_KEY = 'HARD_REFRESH_TS';

export default function BuildTag() {
  const tapsRef = useRef({ count: 0, timer: null });

  const oneShotReloadOnControllerChange = () => {
    let fired = false;
    const handler = () => {
      if (fired) return;
      fired = true;
      navigator.serviceWorker.removeEventListener('controllerchange', handler);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handler);
  };

  const hardRefresh = async () => {
    // mark a hard refresh so the banner won’t also reload
    try { sessionStorage.setItem(HARD_REFRESH_KEY, String(Date.now())); } catch {}

    // Clean caches, but DO NOT unregister the SW (that’s what causes churn)
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {}

    // If there’s a waiting worker, activate it and reload **once** on controllerchange
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        oneShotReloadOnControllerChange();
        return; // controllerchange will trigger reload
      }
    } catch {}

    // No waiting worker → regular reload
    window.location.replace(window.location.href.split('#')[0]);
  };

  const onTap = () => {
    const t = tapsRef.current;
    t.count += 1;
    if (t.count === 1) {
      t.timer = setTimeout(() => { t.count = 0; t.timer = null; }, 800);
    }
    if (t.count >= 3) {
      if (t.timer) { clearTimeout(t.timer); t.timer = null; }
      t.count = 0;
      hardRefresh();
    }
  };

  return (
    <Box
      onClick={onTap}
      position="fixed"
      bottom="8px"
      right="12px"
      fontSize="11px"
      color="gray.600"
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      px="2"
      py="0.5"
      borderRadius="md"
      shadow="sm"
      opacity={0.95}
      zIndex={1000}
      cursor="pointer"
      title="Triple-tap to hard refresh"
      aria-label="Build version badge. Triple-tap to hard refresh."
    >
      {BUILD_VERSION || 'dev'}
    </Box>
  );
}