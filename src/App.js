// src/App.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Spinner, Text, Button } from '@chakra-ui/react';
import { supabase } from './supabaseClient';

import SignIn from './auth/SignIn';
import AdminDashboard from './AdminDashboard';
import MainAttendanceApp from './MainAttendanceApp';
import BoardDashboard from './BoardDashboard';
import ResetPassword from './auth/ResetPassword';
import UpdateBanner from './components/UpdateBanner';

const SPLASH_TIMEOUT_MS = 8000;

function Splash({ onRetry, message = 'Loading…' }) {
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" direction="column" gap={4}>
      <Spinner size="lg" />
      <Text fontSize="sm" color="gray.600">{message}</Text>
      <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    </Flex>
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, { retries = 2, delay = 250, factor = 2 } = {}) {
  let last;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) { last = e; }
    await sleep(delay); delay *= factor;
  }
  throw last;
}

async function fetchRole(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data?.role ?? null;
}

export default function App() {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [softError, setSoftError] = useState('');

  const splashTimer = useRef(null);
  const mountedRef  = useRef(true);

  const isResetRoute = useMemo(
    () => typeof window !== 'undefined' && window.location.pathname === '/reset-password',
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(splashTimer.current);
    };
  }, []);

  const initialize = async () => {
    setSoftError('');
    setLoading(true);

    clearTimeout(splashTimer.current);
    splashTimer.current = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false);
        setSoftError('Taking longer than expected. Check your connection and retry.');
      }
    }, SPLASH_TIMEOUT_MS);

    try {
      // Handle PKCE (password reset / magic link). No-op if code not present.
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('code')) {
          await supabase.auth.exchangeCodeForSession();
        }
      } catch {}

      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        // Fetch role with a couple retries
        const r = await withRetry(() => fetchRole(u.id), { retries: 2, delay: 300 });
        setRole(r);
      } else {
        setRole(null);
      }
    } catch (err) {
      setSoftError(err?.message || 'Failed to initialize.');
      setRole(null);
    } finally {
      clearTimeout(splashTimer.current);
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    initialize();

    const relevant = new Set(['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED']);
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!relevant.has(event)) return;

      const u = session?.user ?? null;
      setUser(u);

      if (!u) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const r = await withRetry(() => fetchRole(u.id), { retries: 2, delay: 300 });
        setRole(r);
      } catch (e) {
        setSoftError(e?.message || 'Role lookup failed.');
      } finally {
        setLoading(false);
      }
    });

    // If the tab comes back to foreground after being idle, and we're not logged in,
    // try initialization again (helps recover from network blips).
    const onVis = () => {
      if (document.visibilityState === 'visible' && !user) {
        initialize();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      sub?.subscription?.unsubscribe?.();
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } finally {
      setUser(null);
      setRole(null);
    }
  };

  // Route: reset-password is standalone
  if (isResetRoute) {
    return (
      <Box minH="100vh" bg="background" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Box maxW="560px" mx="auto">
          <ResetPassword />
        </Box>
      </Box>
    );
  }

  if (loading) {
    return <Splash onRetry={initialize} message={softError || 'Loading…'} />;
  }

  if (!user) {
    return <SignIn setUser={setUser} />;
  }

  // App shell
  const AppShell = ({ children }) => (
    <Box
      minH="100vh"
      bg="background"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 10 }}
      pb={`calc(env(safe-area-inset-bottom) + 24px)`}
    >
      <Box maxW="560px" mx="auto">
        {children}
      </Box>
      <UpdateBanner />
    </Box>
  );

  // Role switch
  if (role === 'admin') {
    return (
      <AppShell>
        <AdminDashboard user={user} onLogout={handleLogout} />
      </AppShell>
    );
  }
  if (role === 'engineer') {
    return (
      <AppShell>
        <MainAttendanceApp user={user} onLogout={handleLogout} />
      </AppShell>
    );
  }
  if (role === 'board') {
    return (
      <AppShell>
        <BoardDashboard user={user} onLogout={handleLogout} />
      </AppShell>
    );
  }

  // Fallback if role is unknown after attempts
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" px={6} direction="column" gap={3}>
      <Box textAlign="center">
        <Text fontSize="lg" mb={2}>Access denied</Text>
        <Text fontSize="sm" color="gray.600">
          Your account doesn’t have a recognized role. Please contact an administrator.
        </Text>
      </Box>
      <Button size="sm" variant="outline" onClick={initialize}>Retry</Button>
      <Button size="sm" variant="ghost" onClick={handleLogout}>Sign out</Button>
    </Flex>
  );
}