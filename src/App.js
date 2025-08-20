// src/App.js
import React, { useEffect, useState } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { supabase } from './supabaseClient';

import Login from './Login';
import MainAttendanceApp from './MainAttendanceApp';
import AdminDashboard from './AdminDashboard';
import BoardDashboard from './BoardDashboard';
import ResetPassword from './ResetPassword';
import UpdateBanner from './components/UpdateBanner';

export default function App() {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Route guard: if we're on /reset-password, render only that screen.
  // We intentionally do NOT mount UpdateBanner on this route to avoid reload races.
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isResetRoute = pathname === '/reset-password';

  useEffect(() => {
    const getSessionAndUser = async () => {
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
      (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (currentUser) {
          fetchUserRole(currentUser.id);
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

  // -------- Reset password route (standalone) --------
  if (isResetRoute) {
    return (
      <Box minH="100vh" bg="background" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Box maxW="560px" mx="auto">
          <ResetPassword />
        </Box>
      </Box>
    );
  }

  // -------- Normal app flow --------
  if (loading) {
    return (
      <Flex align="center" justify="center" minH="100vh" bg="background">
        <Spinner size="lg" />
      </Flex>
    );
  }

  if (!user) {
    return (
      <Box minH="100vh" bg="background" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        <Box maxW="560px" mx="auto">
          <Login setUser={setUser} />
        </Box>
        {/* Mount once here — not inside role shells */}
        <UpdateBanner />
      </Box>
    );
  }

  // Shared shell for authenticated pages (no header; Apple-like canvas)
  const Shell = ({ children }) => (
    <Box
      minH="100vh"
      bg="background"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 10 }}
      pb={`calc(env(safe-area-inset-bottom) + 24px)`}
    >
      <Box maxW="560px" mx="auto">{children}</Box>
    </Box>
  );

  let content = null;
  if (role === 'admin') {
    content = <AdminDashboard user={user} onLogout={handleLogout} />;
  } else if (role === 'engineer') {
    content = <MainAttendanceApp user={user} onLogout={handleLogout} />;
  } else if (role === 'board') {
    content = <BoardDashboard user={user} onLogout={handleLogout} />;
  } else {
    content = (
      <Flex align="center" justify="center" minH="50vh" px={6}>
        <Box textAlign="center">
          <Text fontSize="lg" mb={2}>Access denied</Text>
          <Text fontSize="sm" color="gray.600">
            Your account doesn’t have a recognized role. Please contact an administrator.
          </Text>
        </Box>
      </Flex>
    );
  }

  return (
    <Shell>
      {content}
      {/* Mount once here for all authenticated roles */}
      <UpdateBanner />
    </Shell>
  );
}