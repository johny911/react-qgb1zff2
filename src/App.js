// src/App.js
import React, { useEffect, useState } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { supabase } from './supabaseClient';

import Login from './Login';
import MainAttendanceApp from './MainAttendanceApp';
import AdminDashboard from './AdminDashboard';
import BoardDashboard from './BoardDashboard';
import UpdateBanner from './components/UpdateBanner';
import ResetPassword from './ResetPassword';

export default function App() {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Is the current URL the password reset page?
  const isResetRoute =
    typeof window !== 'undefined' &&
    window.location.pathname === '/reset-password';

  useEffect(() => {
    const getSessionAndUser = async () => {
      // 1) If the Supabase email link includes a `code` param (PKCE),
      //    exchange it for a session so the reset screen has auth.
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.get('code');
        if (hasCode) {
          await supabase.auth.exchangeCodeForSession();
        }
      } catch (_) {
        // ignore — safe no-op if param isn't present
      }

      // 2) Now read the session
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserRole(currentUser.id);
      } else {
        setLoading(false);
      }
    };

    getSessionAndUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (currentUser) {
          await fetchUserRole(currentUser.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const fetchUserRole = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching role:', error.message);
      setRole(null);
    } else {
      setRole(data?.role || null);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" minH="100vh" bg="background">
        <Spinner size="lg" />
      </Flex>
    );
  }

  // Show the password reset screen whenever the route is /reset-password,
  // regardless of login state or role.
  if (isResetRoute) {
    return (
      <Box
        minH="100vh"
        bg="background"
        px={{ base: 4, md: 6 }}
        py={{ base: 6, md: 10 }}
      >
        <Box maxW="560px" mx="auto">
          <ResetPassword />
        </Box>
      </Box>
    );
  }

  if (!user) {
    return <Login setUser={setUser} />;
  }

  // Minimal shell (no header, no nav)
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

  // Unknown role fallback
  return (
    <Flex align="center" justify="center" minH="100vh" bg="background" px={6}>
      <Box textAlign="center">
        <Text fontSize="lg" mb={2}>Access denied</Text>
        <Text fontSize="sm" color="gray.600">
          Your account doesn’t have a recognized role. Please contact an administrator.
        </Text>
      </Box>
    </Flex>
  );
}