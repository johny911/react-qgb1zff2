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
import { BUILD_VERSION } from './version';

const SPLASH_TIMEOUT_MS = 12000; // allow a little longer on cold refresh

// ---------- UI ----------
function Splash({ onRetry, message = 'Loading…' }) {
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" direction="column" gap={4}>
      <Spinner size="lg" />
      <Text fontSize="sm" color="gray.600">{message}</Text>
      <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
    </Flex>
  );
}

// Small, global build/version badge (always visible)
function BuildTag() {
  const label = BUILD_VERSION || 'dev';
  return (
    <Box
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
      zIndex={2147483647} // above everything
      pointerEvents="none"
      aria-label="Build version badge"
    >
      {label}
    </Box>
  );
}

// ---------- Small utils ----------
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
  try {
    const v = sessionStorage.getItem(roleCacheKey(uid));
    return v ? v : null; // empty string treated as null
  } catch { return null; }
};
const writeCachedRole = (uid, role) => {
  try { sessionStorage.setItem(roleCacheKey(uid), role || ''); } catch {}
};
const clearCachedRole = (uid) => {
  try { sessionStorage.removeItem(roleCacheKey(uid)); } catch {}
};

// ---------- DB helpers ----------
async function fetchRoleOnce(userId) {
  // Single, strict read; RLS should allow: auth.uid() = id
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle(); // tolerate “0 rows” gracefully

  if (error) throw error;
  return data?.role ?? null;
}

async function ensureProfile(user) {
  if (!user?.id) return null;

  try {
    const role = await fetchRoleOnce(user.id);
    if (role) return role;
  } catch {
    // fall through to insert attempt
  }

  const first = user.user_metadata?.first_name?.toString().trim() || '';
  const last  = user.user_metadata?.last_name?.toString().trim() || '';
  const display = [first, last].filter(Boolean).join(' ') || null;

  const { error: insertErr } = await supabase
    .from('users')
    .insert({ id: user.id, email: user.email, name: display, role: 'engineer' });

  if (insertErr) {
    // If row now exists or RLS blocked insert, try one more read
    try { return await fetchRoleOnce(user.id); } catch (e) { throw insertErr; }
  }
  return 'engineer';
}

// --- Wait until Supabase has a live session (prevents race on refresh)
async function waitForSession({ maxWaitMs = 3500 } = {}) {
  const start = Date.now();

  // One proactive refresh helps when the memory cache is cold
  try { await supabase.auth.refreshSession(); } catch {}

  while (Date.now() - start < maxWaitMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session;
    await sleep(120);
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session || null;
}

export default function App() {
  const [user, setUser]           = useState(null);
  const [role, setRole]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [verifying, setVerifying] = useState(false);
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

  // ---- central boot routine ----
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
      // Handle PKCE code (magic/reset links)
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('code')) {
          await supabase.auth.exchangeCodeForSession();
        }
      } catch {}

      // 🔐 Wait until Supabase actually has a usable session
      const stableSession = await waitForSession();
      const u = stableSession?.user ?? null;
      setUser(u);

      if (!u) {
        setRole(null);              // not logged in -> SignIn
        return;
      }

      // Optimistic role from cache while verifying truth
      const cached = readCachedRole(u.id);
      if (cached) {
        setRole(cached);
        setVerifying(true);
      }

      // Determine role robustly (ensure row, then read)
      const ensuredRole = await withRetry(() => ensureProfile(u), { retries: 2, delay: 200 });
      const freshRole   = await withRetry(() => fetchRoleOnce(u.id), { retries: 2, delay: 200 });

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

    // Only react to real state changes
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

      try {
        // Small grace period: let session settle after refresh
        await sleep(event === 'TOKEN_REFRESHED' ? 100 : 0);
        const freshRole = await withRetry(() => fetchRoleOnce(u.id), { retries: 2, delay: 200 });
        setRole(freshRole);
        writeCachedRole(u.id, freshRole || '');
      } catch (e) {
        setSoftError(e?.message || 'Role check failed.');
      } finally {
        setLoading(false);
        setVerifying(false);
      }
    });

    // If tab becomes visible and we’re unauthenticated but idle, try again
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (!user && !loading) initialize();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      sub?.subscription?.unsubscribe?.();
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } finally {
      const uid = user?.id;
      setUser(null);
      setRole(null);
      setVerifying(false);
      if (uid) clearCachedRole(uid);
    }
  };

  // ---- /reset-password should always show the reset screen ----
  if (isResetRoute) {
    return (
      <Box minH="100vh" bg="background" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Box maxW="560px" mx="auto">
          <ResetPassword />
        </Box>
        <BuildTag />
      </Box>
    );
  }

  // Keep showing splash while we *might* still determine the role
  if (loading || verifying) {
    return (
      <>
        <Splash onRetry={initialize} message={softError || 'Loading…'} />
        <BuildTag />
      </>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <SignIn setUser={setUser} />
        <BuildTag />
      </>
    );
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
      <BuildTag />
    </Box>
  );

  // Route by role
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

  // Only show Access denied if we truly have a user but no known role after all checks
  return (
    <>
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
      <BuildTag />
    </>
  );
}