// src/App.js
import React, { useEffect, useState, useRef } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { supabase } from './supabaseClient';

import Login from './Login';
import MainAttendanceApp from './MainAttendanceApp';
import AdminDashboard from './AdminDashboard';
import BoardDashboard from './BoardDashboard';
import ResetPassword from './ResetPassword';            // ✅ for /reset-password route
import UpdateBanner from './components/UpdateBanner';   // ✅ mounted exactly once here
import BuildTag from './components/BuildTag';           // ✅ mounted exactly once here

export default function App() {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Guard: special route for password reset — render only the screen, no SW widgets.
  const isResetRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/reset-password');

  // Prevent overlapping role fetches
  const fetchingRoleRef = useRef(false);

  useEffect(() => {
    let unsub = null;

    const prime = async () => {
      // 1) Get existing session once
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        await safeFetchUserRole(currentUser.id);
      } else {
        setLoading(false);
      }

      // 2) Listen for auth changes (single listener)
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          const u = newSession?.user || null;
          setUser(u);
          if (u) {
            await safeFetchUserRole(u.id);
          } else {
            setRole(null);
            setLoading(false);
          }
        }
      );
      unsub = () => listener?.subscription?.unsubscribe();
    };

    prime();

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeFetchUserRole = async (userId) => {
    if (fetchingRoleRef.current) return;
    fetchingRoleRef.current = true;
    try {
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
    } finally {
      fetchingRoleRef.current = false;
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  // ————————————————————————————
  // Route: /reset-password (no UpdateBanner/BuildTag here to avoid any refresh loops)
  // ————————————————————————————
  if (isResetRoute) {
    return (
      <Box minH="100vh" bg="background" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Box maxW="560px" mx="auto">
          <ResetPassword />
        </Box>
      </Box>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Flex align="center" justify="center" minH="100vh" bg="background">
        <Spinner size="lg" />
      </Flex>
    );
  }

  // Not logged in
  if (!user) {
    return <Login setUser={setUser} />;
  }

  // Single, minimal shell (Apple-like). UpdateBanner & BuildTag mounted ONCE here.
  const AppShell = ({ children }) => (
    <Box
      minH="100vh"
      bg="background"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 10 }}
      pb={`calc(env(safe-area-inset-bottom) + 24px)`}
    >
      <Box maxW="560px" mx="auto">{children}</Box>

      {/* ✅ Mounted once per app view; excluded on /reset-password */}
      <UpdateBanner />
      <BuildTag />
    </Box>
  );

  // Role routing
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