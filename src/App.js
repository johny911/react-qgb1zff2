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
    return v ? v : null;
  } catch { return null; }
};
const writeCachedRole = (uid, role) => {
  try { sessionStorage.setItem(roleCacheKey(uid), role || ''); } catch {}
};
const clearCachedRole = (uid) => {
  try { sessionStorage.removeItem(roleCacheKey(uid)); } catch {}
};

/* ---------- helpers made tolerant (no throws) ---------- */
async function fetchRoleOnce(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (error) return null;               // <- do not throw
    return data?.role ?? null;
  } catch {
    return null;
  }
}

// Ensure a row exists; return the role we can deduce, or null. Never throw.
async function ensureProfile(user) {
  if (!user?.id) return null;

  // If row exists, use it
  const existing = await fetchRoleOnce(user.id);
  if (existing) return existing;

  // Try insert with safe defaults
  try {
    const first = user.user_metadata?.first_name?.toString().trim() || '';
    const last  = user.user_metadata?.last_name?.toString().trim() || '';
    const display = [first, last].filter(Boolean).join(' ') || null;

    await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      name: display,
      role: 'engineer',
    });
    // Read back (best effort)
    return (await fetchRoleOnce(user.id)) ?? 'engineer';
  } catch {
    return null; // tolerate RLS/network — boot can still proceed with fallback
  }
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
      // PKCE exchange (password/magic links)
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get('code')) {
          await supabase.auth.exchangeCodeForSession();
        }
      } catch {}

      // Session
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);

      if (!u) {
        setRole(null);
        return;
      }

      // Optimistic role from cache
      const cached = readCachedRole(u.id);
      if (cached) {
        setRole(cached);
        setVerifying(true);
      }

      // Best-effort: ensure row, then read role
      const ensuredRole = await withRetry(() => ensureProfile(u), { retries: 2, delay: 250 });
      const freshRole   = await withRetry(() => fetchRoleOnce(u.id), { retries: 2, delay: 250 });

      const finalRole = freshRole || ensuredRole || cached || 'engineer'; // <- safe fallback
      setRole(finalRole);
      writeCachedRole(u.id, finalRole);
      setVerifying(false);
    } catch (err) {
      // <- On any boot failure, still pick a safe role so we don’t lock out on refresh
      const u = supabase.auth.getSession?.() ? (await supabase.auth.getSession()).data.session?.user : null;
      const cached = u ? readCachedRole(u.id) : null;
      setRole(cached || 'engineer');
      setSoftError(err?.message || 'Failed to initialize.');
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
        setVerifying(false);
        setLoading(false);
        return;
      }

      try {
        const freshRole = await withRetry(() => fetchRoleOnce(u.id), { retries: 2, delay: 250 });
        const safeRole = freshRole || readCachedRole(u.id) || 'engineer'; // <- safe fallback here too
        setRole(safeRole);
        writeCachedRole(u.id, safeRole);
      } catch (e) {
        const safeRole = readCachedRole(u.id) || 'engineer';
        setRole(safeRole);
        setSoftError(e?.message || 'Role check failed.');
      } finally {
        setLoading(false);
        setVerifying(false);
      }
    });

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
  }, []); // mount once

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } finally {
      const uid = user?.id;
      setUser(null);
      setRole(null);
      setVerifying(false);
      if (uid) clearCachedRole(uid);
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

  if (loading || verifying) {
    return <Splash onRetry={initialize} message={softError || 'Loading…'} />;
  }

  if (!user) {
    return <SignIn setUser={setUser} />;
  }

  const AppShell = ({ children }) => (
    <Box minH="100vh" bg="background" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }} pb={`calc(env(safe-area-inset-bottom) + 24px)`}>
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