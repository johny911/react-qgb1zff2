// src/AdminDashboard.js
import React, { useRef } from 'react';
import {
  Box, Heading, Text, Tabs, TabList, TabPanels, Tab, TabPanel,
  HStack, Badge, Button, Stack
} from '@chakra-ui/react';
import { SectionCard } from './components/ui/Kit';
import ProjectsTab from './admin/ProjectsTab';
import TeamsTab from './admin/TeamsTab';
import LabourTypesTab from './admin/LabourTypesTab';
import AssignTab from './admin/AssignTab';
import { BUILD_VERSION } from './version';

function BuildTag() {
  const taps = useRef({ c: 0, t: null });
  const hardRefresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(async r => { try { await r.update(); } catch {} try { await r.unregister(); } catch {} }));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } finally {
      window.location.replace(window.location.href.split('#')[0]);
    }
  };
  const onTap = () => {
    const x = taps.current;
    x.c += 1;
    if (x.c === 1) x.t = setTimeout(() => { x.c = 0; x.t = null; }, 800);
    if (x.c >= 3) { if (x.t) clearTimeout(x.t); x.c = 0; x.t = null; hardRefresh(); }
  };
  return (
    <Box
      onClick={onTap}
      position="fixed" bottom="8px" right="12px" zIndex={1000}
      fontSize="11px" color="gray.600" bg="white"
      border="1px solid" borderColor="gray.200" px="2" py="0.5"
      borderRadius="md" shadow="sm" cursor="pointer"
      title="Triple-tap to hard refresh" aria-label="Build version badge"
    >
      {BUILD_VERSION || 'dev'}
    </Box>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  return (
    <Box bg="gray.50" minH="100vh" py={8} px={4} overflowX="hidden">
      <Box maxW="800px" w="100%" mx="auto">
        <Stack
          direction={{ base: 'column', sm: 'row' }} align={{ base: 'flex-start', sm: 'center' }}
          justify="space-between" spacing={3} mb={4} w="100%"
        >
          <Heading size="lg" lineHeight="short">Admin{' ' }Dashboard</Heading>
          <HStack spacing={2} w={{ base: '100%', sm: 'auto' }} minW={0} flexShrink={0}>
            <Badge
              colorScheme="purple" variant="subtle" px={2} py={1}
              maxW={{ base: '100%', sm: '60%' }} minW={0}
              overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap"
              title={user?.email}
            >
              {user?.email}
            </Badge>
            <Button size="sm" variant="outline" onClick={onLogout} flexShrink={0}>Logout</Button>
          </HStack>
        </Stack>

        <SectionCard
          title="Controls"
          subtitle="Manage projects, teams, and labour types. Assign engineers to projects."
        >
          <Tabs variant="enclosed" colorScheme="brand" w="100%">
            <TabList
              w="100%"
              overflowX="auto"
              overflowY="hidden"              // ← stop the vertical scrollbar
              whiteSpace="nowrap"
              sx={{
                '::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Tab px={3} flexShrink={0} minW="fit-content">Projects</Tab>
              <Tab px={3} flexShrink={0} minW="fit-content">Teams</Tab>
              <Tab px={3} flexShrink={0} minW="fit-content">Labour Types</Tab>
              <Tab px={3} flexShrink={0} minW="fit-content">Assign</Tab>
            </TabList>

            <TabPanels w="100%">
              <TabPanel px={0}><ProjectsTab /></TabPanel>
              <TabPanel px={0}><TeamsTab /></TabPanel>
              <TabPanel px={0}><LabourTypesTab /></TabPanel>
              <TabPanel px={0}><AssignTab /></TabPanel>
            </TabPanels>
          </Tabs>
        </SectionCard>

        <Text mt={3} fontSize="xs" color="gray.500">
          Tip: pull down to refresh if you add data elsewhere.
        </Text>
      </Box>

      <BuildTag />
    </Box>
  );
}