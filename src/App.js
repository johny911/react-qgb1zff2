// src/App.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  Box,
  Flex,
  Heading,
  Button,
  Spinner,
  Text,
  useColorMode,
  IconButton,
} from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';
import Login from './Login';
import MainAttendanceApp from './MainAttendanceApp';
import AdminDashboard from './AdminDashboard';

export default function App() {
  const [user, setUser]     = useState(null);
  const [role, setRole]     = useState(null);
  const [loading, setLoading] = useState(true);
  const { colorMode, toggleColorMode } = useColorMode();

  useEffect(() => {
    const getSessionAndUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;
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
      setRole(data?.role);
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
      <Flex align="center" justify="center" minH="100vh">
        <Spinner size="lg" />
      </Flex>
    );
  }

  if (!user) {
    return <Login setUser={setUser} />;
  }

  const AppShell = ({ children }) => (
    <Box minH="100vh" bg="background">
      <Flex
        as="header"
        bg="brand.700"
        color="white"
        px={4}
        py={3}
        align="center"
        justify="space-between"
      >
        <Heading size="md">SiteTrack</Heading>
        <Flex align="center" gap={2}>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            size="sm"
            onClick={toggleColorMode}
          />
          <Button variant="outline" colorScheme="whiteAlpha" onClick={handleLogout}>
            Logout
          </Button>
        </Flex>
      </Flex>
      <Box as="main" p={4}>
        {children}
      </Box>
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

  return (
    <Flex align="center" justify="center" p={8}>
      <Text>Access denied.</Text>
    </Flex>
  );
}