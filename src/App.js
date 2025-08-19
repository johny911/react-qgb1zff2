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

const SPLASH_TIMEOUT_MS = 8000; // global guard

// ------------- UI -------------
function Splash({ onRetry, message = 'Loading…' }) {
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" direction="column" gap={4}>
      <Spinner size="lg" />
      <Text fontSize="sm" color="gray.600">{message}</Text>
      <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    </Flex>
  );
}

// ------------- Small utils -------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, { retries = 2, delay = 250, factor = 2 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try { return await fn(); } catch (e) { lastErr = e; }
    await sleep(delay);
    delay *= factor;
  }
  throw lastErr;
}
const roleCacheKey = (uid) => `role:${uid}`;
const readCachedRole = (uid) => {
  try { return sessionStorage.getItem(roleCacheKey(uid)) || null; } catch { return null; }
};
const writeCachedRole = (uid, role) => {
  try { sessionStorage.setItem(roleCacheKey(uid), role || ''); } catch {}
};
const clearCachedRole = (uid) => {
  try { sessionStorage.removeItem(roleCacheKey(uid)); } catch {}
};

// ------------- DB helpers -------------
async function fetchRoleOnce(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data?.role ?? null;
}

// Ensure there is a row in `public.users` for this auth user.
// Does NOT overwrite role if the row already exists.
async function ensureProfile(user) {
  if (!user?.id) return null;

  // 1) Is there already a row? If yes, return its role (don’t touch).
  try {
    const role = await fetchRoleOnce(user.id);
    return role;
  } catch (_) {
    /* fall through to insert */
  }

  // 2) Insert a new row with default role 'engineer' (adjust if needed).
  const first = user.user_metadata?.first_name?.toString().trim() || '';
  const last  = user.user_metadata?.last_name?.toString().trim() || '';
  const display = [first, last].filter(Boolean).join(' ') || null;

  // Insert only if not exists (avoid overwriting)
  const { error: upsertErr } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email,
      name: display,
      role: 'engineer',
    });

  if (upsertErr) {
    // If insert failed due to race (row now exists), just read role again
    try { return await fetchRoleOnce(user.id); } catch (e) { throw upsertErr; }
  }

  return 'engineer';
}

export default function App() {
  const [user, setUser]           = useState(null);
  const [role, setRole]           = useState(null);
  const [loading, setLoading]     = useState(true);   // overall splash (auth + first role attempt)
  const [verifying, setVerifying] = useState(false);  // background verify when using cache
  const [softError, setSoftError] = useState('');

  const splashTimer = useRef(null);
  const mountedRef  = useRef(true);

  const isResetRoute = useMemo(
    () => typeof window !== 'undefined' && window.location.pathname === '/reset-password',
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearTimeout(splashTimer.current); };
  }, []);

  // --- central boot routine ---
  const initialize = async () => {
    setSoftError('');
    setLoading(true);
    setVerifying(false);

    clearTimeout(splashTimer.current);
    splashTimer.current = setTimeout(() => {
      if (mountedRef.current) {
        setLoading(false);
        setSoftError('Taking longer than expected. Check your connection and retry.');
      }
    }, SPLASH_TIMEOUT_MS);

    try {
      // Handle PKCE code silently if present (reset links / magic links)
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('code')) {
          await supabase.auth.exchangeCodeForSession(); // no-op if token invalid
        }
      } catch {}

      // 1) Get current session
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);

      if (!u) {
        // no user -> done
        clearCachedRole('unknown');
        setRole(null);
        return;
      }

      // 2) Optimistic role from cache (instant render) while verifying
      const cached = readCachedRole(u.id);
      if (cached) {
        setRole(cached);
        setVerifying(true);
      }

      // 3) Ensure there is a profile row; then fetch role with retries
      const ensuredRole = await withRetry(() => ensureProfile(u), { retries: 2, delay: 250 });
      const freshRole   = await withRetry(() => fetchRoleOnce(u.id), { retries: 2, delay: 250 });

      const finalRole = freshRole || ensuredRole || null;
      setRole(finalRole);
      writeCachedRole(u.id, finalRole || '');
      setVerifying(false);
    } catch (err) {
      setSoftError(err?.message || 'Failed to initialize.');
    } finally {
      clearTimeout(splashTimer.current);
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    initialize();

    // Filter noisy auth events; only handle the ones that truly change state
    const relevant = new Set(['SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', 'USER_UPDATED']);
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!relevant.has(event)) return;

      const u = session?.user ?? null;
      setUser(u);

      if (!u) {
        setRole(null);
        setVerifying(false);
        setLoading(false);
        return;
      }

      // Re-check role after meaningful auth state changes
      try {
        const freshRole = await withRetry(() => fetchRoleOnce(u.id), { retries: 2, delay: 250 });
        setRole(freshRole);
        writeCachedRole(u.id, freshRole || '');
      } catch (e) {
        // If it fails, keep whatever we have and try again later
        setSoftError(e?.message || 'Role check failed.');
      } finally {
        setLoading(false);
        setVerifying(false);
      }
    });

    // Retry when tab becomes visible and we’re unauthenticated but not loading
    const onVis = () => {
      if (document.visibilityState === 'visible' && !user && !loading) initialize();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      sub?.subscription?.unsubscribe?.();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []); // intentional: run once on mount

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } finally {
      setUser(null);
      setRole(null);
      setVerifying(false);
      clearCachedRole(user?.id || 'unknown');
    }
  };

  // --- route: /reset-password should always show the reset screen ---
  if (isResetRoute) {
    return (
      <Box minH="100vh" bg="background" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Box maxW="560px" mx="auto">
          <ResetPassword />
        </Box>
      </Box>
    );
  }

  // --- gate rendering until we’re sure ---
  if (loading || verifying) {
    return <Splash onRetry={initialize} message={softError || 'Loading…'} />;
  }

  // Not logged in yet
  if (!user) {
    return <SignIn setUser={setUser} />;
  }

  // App shell (Apple-like canvas)
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

  // Now decide by role
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

  // If we truly have no valid role after all checks:
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" px={6} direction="column" gap={3}>
      <Box textAlign="center">
        <Text fontSize="lg" mb={2}>Access denied</Text>
        <Text fontSize="sm" color="gray.600">
          Your account doesn’t have a recognized role. Please contact an administrator.
        </Text>
      </Box>
      <Button size="sm" variant="outline" onClick={initialize}>Retry</Button>
    </Flex>
  );
}