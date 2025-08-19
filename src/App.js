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

const SPLASH_TIMEOUT_MS = 7000;

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
  const [hint, setHint]       = useState('');

  const timeoutRef = useRef(null);
  const mounted    = useRef(true);

  const isResetRoute = useMemo(
    () => typeof window !== 'undefined' && window.location.pathname === '/reset-password',
    []
  );

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(timeoutRef.current); };
  }, []);

  const fetchRole = async (uid) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', uid)
      .single();
    if (error) throw error;
    return data?.role ?? null;
  };

  const init = async () => {
    clearTimeout(timeoutRef.current);
    setHint('');
    setLoading(true);

    timeoutRef.current = setTimeout(() => {
      if (mounted.current) {
        setLoading(false);
        setHint('Taking longer than expected. Check connection and try again.');
      }
    }, SPLASH_TIMEOUT_MS);

    try {
      // Handle supabase PKCE links (email magic/reset)
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('code')) {
          await supabase.auth.exchangeCodeForSession(); // safe no-op if invalid
        }
      } catch {}

      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);

      if (!u) {
        setRole(null);
        return; // show SignIn
      }

      // Fetch role (single, no retries; don’t block the UI forever)
      try {
        const r = await fetchRole(u.id);
        setRole(r);
      } catch (e) {
        // If we can’t read a role, don’t loop—show Access denied with a Sign out
        setRole(null);
        setHint(e.message || 'Failed to read role.');
      }
    } finally {
      clearTimeout(timeoutRef.current);
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      // Re-run init to re-check session/role
      await init();
    });

    const onVis = () => {
      if (document.visibilityState === 'visible') init();
    };
    window.addEventListener('focus', onVis);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      sub?.subscription?.unsubscribe?.();
      window.removeEventListener('focus', onVis);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } finally {
      setUser(null);
      setRole(null);
      setLoading(false);
    }
  };

  if (isResetRoute) {
    return (
      <Box minH="100vh" bg="background" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Box maxW="560px" mx="auto">
          <ResetPassword />
        </Box>
      </Box>
    );
  }

  if (loading) return <Splash onRetry={init} message={hint || 'Loading…'} />;

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

  // Unknown/missing role (don’t spin; give actionable UI)
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" px={6} direction="column" gap={3}>
      <Box textAlign="center">
        <Text fontSize="lg" mb={2}>Access denied</Text>
        {hint ? <Text fontSize="sm" color="gray.600" mb={2}>{hint}</Text> : null}
        <Text fontSize="sm" color="gray.600">
          Your account doesn’t have a recognized role. Please contact an administrator.
        </Text>
      </Box>
      <Button size="sm" variant="outline" onClick={init}>Retry</Button>
      <Button size="sm" variant="ghost" onClick={handleLogout}>Sign out</Button>
    </Flex>
  );
}