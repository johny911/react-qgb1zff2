// src/components/BuildTag.js
import React, { useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { BUILD_VERSION } from '../version';

const HARD_REFRESH_KEY = 'HARD_REFRESH_IN_PROGRESS';

export default function BuildTag() {
  const tapsRef = useRef({ count: 0, timer: null });

  const hardRefreshOnce = async () => {
    // Mark that we’re performing a hard refresh so other code (e.g., update banner)
    // can skip any auto-reload this one time.
    try {
      sessionStorage.setItem(HARD_REFRESH_KEY, '1');
    } catch {}

    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        // IMPORTANT: Do NOT call reg.update() here. It can create a new waiting worker.
        await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      // Reload to a clean URL (no hash/search) to avoid multiple navigations.
      const clean = window.location.origin + window.location.pathname;
      window.location.replace(clean);
    }
  };

  const onTap = () => {
    const t = tapsRef.current;
    t.count += 1;
    if (t.count === 1) {
      t.timer = setTimeout(() => {
        t.count = 0;
        t.timer = null;
      }, 800);
    }
    if (t.count >= 3) {
      if (t.timer) {
        clearTimeout(t.timer);
        t.timer = null;
      }
      t.count = 0;
      hardRefreshOnce();
    }
  };

  const label = BUILD_VERSION || 'dev';
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
      {label}
    </Box>
  );
}