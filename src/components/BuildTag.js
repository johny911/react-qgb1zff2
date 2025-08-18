// src/components/BuildTag.js
import React, { useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { BUILD_VERSION } from '../version';

export default function BuildTag() {
  const tapsRef = useRef({ count: 0, timer: null });

  const hardRefresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (r) => {
            try { await r.update(); } catch {}
            try { await r.unregister(); } catch {}
          })
        );
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      window.location.replace(window.location.href.split('#')[0]);
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
      hardRefresh();
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