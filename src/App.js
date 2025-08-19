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

const SAFETY_TIMEOUT_MS = 6000;

function Splash({ onRetry, message = 'Loading…' }) {
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" direction="column" gap={4}>
      <Spinner size="lg" />
      <Text fontSize="sm" color="gray.600">{message}</Text>
      <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    </Flex>
  );
}

export default function App() {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [softError, setSoftError] = useState('');
  const safetyTimer = useRef(null);
  const mounted = useRef(true);

  const isResetRoute = useMemo(() =>
    typeof window !== 'undefined' && window.location.pathname === '/reset-password', []);

  useEffect(() => {
    mounted.current = true;
    const cleanup = () => { mounted.current = false; if (safetyTimer.current) clearTimeout(safetyTimer.current); };
    return cleanup;
  }, []);

  // Utility: timeout a promise
  const withTimeout = (promise, ms, timeoutMsg = 'Timed out') =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(timeoutMsg)), ms)),
    ]);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('users').select('role').eq('id', userId).single(),
        4000,
        'Role fetch timed out'
      );
      if (error) throw error;
      return data?.role ?? null;
    } catch (err) {
      setSoftError(err.message);
      return null;
    }
  };

  const init = async () => {
    setSoftError('');
    setLoading(true);

    // Global safety: never spin forever
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    safetyTimer.current = setTimeout(() => {
      if (mounted.current) setLoading(false);
      setSoftError('Took too long to start. Check your connection and retry.');
    }, SAFETY_TIMEOUT_MS);

    try {
      // Handle PKCE code flow (Supabase email links) — no-op if not present
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.get('code');
        if (hasCode) {
          await withTimeout(supabase.auth.exchangeCodeForSession(), 4000, 'Auth exchange timed out');
        }
      } catch (_) {}

      // Session
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        4000,
        'Session fetch timed out'
      );
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const r = await fetchUserRole(currentUser.id);
        setRole(r);
      }
    } catch (err) {
      setSoftError(err.message || 'Failed to initialize.');
    } finally {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const r = await fetchUserRole(session.user.id);
        setRole(r);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    // In case the tab was hidden during load, retry when it becomes visible
    const onVis = () => {
      if (document.visibilityState === 'visible' && !user && !role && !loading) {
        init();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      sub?.subscription?.unsubscribe?.();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  // Route: /reset-password always shows the reset screen
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
    return <Splash onRetry={init} message={softError || 'Loading…'} />;
  }

  if (!user) {
    return <SignIn setUser={setUser} />;
  }

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

  // Unknown role
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" px={6} direction="column" gap={3}>
      <Box textAlign="center">
        <Text fontSize="lg" mb={2}>Access denied</Text>
        <Text fontSize="sm" color="gray.600">
          Your account doesn’t have a recognized role. Please contact an administrator.
        </Text>
      </Box>
      <Button size="sm" variant="outline" onClick={init}>Retry</Button>
    </Flex>
  );
}