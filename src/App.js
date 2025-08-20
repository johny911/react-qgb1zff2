/* eslint-disable react-hooks/exhaustive-deps */
// src/App.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  HStack,
  Button,
  Text,
  Spinner,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiClipboard, FiFileText, FiGrid, FiUser } from 'react-icons/fi';

import { supabase } from './supabaseClient';
import Login from './Login';
import MainAttendanceApp from './MainAttendanceApp';
import AdminDashboard from './AdminDashboard';
import BoardDashboard from './BoardDashboard';
import WorkReport from './WorkReport';
import ViewWorkReports from './ViewWorkReports';
import UpdateBanner from './components/UpdateBanner';

export default function App() {
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Local bottom-tab state (role-aware). Default to Attendance for engineers.
  const [tab, setTab] = useState('attendance');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        await fetchUserRole(currentUser.id);
      } else {
        setLoading(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserRole(currentUser.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => sub?.subscription?.unsubscribe();
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
    setTab('attendance');
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" minH="100vh" bg="gray.50">
        <Spinner size="lg" />
      </Flex>
    );
  }

  if (!user) {
    return <Login setUser={setUser} />;
  }

  // ---------- AppShell: Header + Content + Bottom Tabs ----------
  const AppShell = ({ role, tab, setTab, children }) => {
    const headerBg = useColorModeValue('white', 'gray.800');
    const barBg    = useColorModeValue('white', 'gray.800');
    const border   = useColorModeValue('gray.200', 'gray.700');

    const emailLabel = user?.email ?? '';

    return (
      <Box minH="100vh" bg="gray.50" pb="92px">
        {/* Header */}
        <Box
          position="sticky"
          top="0"
          zIndex="10"
          bg={headerBg}
          borderBottom="1px solid"
          borderColor={border}
        >
          <Flex
            maxW="560px"
            mx="auto"
            px={4}
            py={3}
            align="center"
            justify="space-between"
          >
            <Text fontSize="lg" fontWeight="bold">SiteTrack</Text>
            <HStack spacing={2}>
              <HStack
                px={2}
                py={1}
                border="1px solid"
                borderColor={border}
                borderRadius="md"
                fontSize="xs"
              >
                <Icon as={FiUser} />
                <Text noOfLines={1} maxW="180px">{emailLabel}</Text>
              </HStack>
              <Button size="sm" variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </HStack>
          </Flex>
        </Box>

        {/* Content */}
        <Box maxW="560px" mx="auto" px={4} pt={4}>
          {children}
        </Box>

        {/* Bottom tabs (role-aware) */}
        <Box
          position="fixed"
          bottom="0"
          left="0"
          right="0"
          bg={barBg}
          borderTop="1px solid"
          borderColor={border}
          pb={`calc(env(safe-area-inset-bottom) + 8px)`}
          pt="8px"
          zIndex={10}
        >
          <Flex maxW="560px" mx="auto" px={3} gap={2}>
            {role === 'engineer' && (
              <>
                <TabButton
                  active={tab === 'attendance'}
                  onClick={() => setTab('attendance')}
                  icon={FiClipboard}
                  label="Attendance"
                />
                <TabButton
                  active={tab === 'work'}
                  onClick={() => setTab('work')}
                  icon={FiGrid}
                  label="Work"
                />
                <TabButton
                  active={tab === 'reports'}
                  onClick={() => setTab('reports')}
                  icon={FiFileText}
                  label="Reports"
                />
              </>
            )}

            {role === 'admin' && (
              <TabButton
                active={true}
                onClick={() => {}}
                icon={FiGrid}
                label="Admin"
              />
            )}

            {role === 'board' && (
              <TabButton
                active={true}
                onClick={() => {}}
                icon={FiFileText}
                label="Board"
              />
            )}
          </Flex>
        </Box>

        {/* SW update banner */}
        <UpdateBanner />
      </Box>
    );
  };

  const renderEngineerTab = () => {
    if (tab === 'attendance') {
      return <MainAttendanceApp user={user} onLogout={handleLogout} />;
    }
    if (tab === 'work') {
      return <WorkReport onBack={() => setTab('attendance')} />;
    }
    if (tab === 'reports') {
      return <ViewWorkReports onBack={() => setTab('attendance')} />;
    }
    // Fallback
    return <MainAttendanceApp user={user} onLogout={handleLogout} />;
  };

  if (role === 'admin') {
    return (
      <AppShell role={role} tab="admin" setTab={() => {}}>
        <AdminDashboard user={user} onLogout={handleLogout} />
      </AppShell>
    );
  }

  if (role === 'board') {
    return (
      <AppShell role={role} tab="board" setTab={() => {}}>
        <BoardDashboard user={user} onLogout={handleLogout} />
      </AppShell>
    );
  }

  // Engineer (default tab = attendance)
  return (
    <AppShell role="engineer" tab={tab} setTab={setTab}>
      {renderEngineerTab()}
    </AppShell>
  );
}

// Small helper for bottom tabs
function TabButton({ active, onClick, icon, label }) {
  return (
    <Button
      onClick={onClick}
      flex="1"
      variant={active ? 'solid' : 'ghost'}
      colorScheme="brand"
      leftIcon={<Icon as={icon} />}
      size="sm"
    >
      {label}
    </Button>
  );
}