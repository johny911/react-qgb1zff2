// src/BoardDashboard.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Heading, Text, HStack, VStack, Stack, Select, Button, Badge,
  SimpleGrid, Stat, StatLabel, StatNumber, Table, Thead, Tbody, Tr, Th, Td,
  useToast, Icon, Divider
} from '@chakra-ui/react';
import { supabase } from './supabaseClient';
import { BUILD_VERSION } from './version';
import { FiRefreshCw, FiLogOut } from 'react-icons/fi';

/** Build/version badge with triple-tap hard refresh */
function BuildTag() {
  const tapsRef = useRef({ count: 0, timer: null });
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
    const t = tapsRef.current;
    t.count += 1;
    if (t.count === 1) {
      t.timer = setTimeout(() => { t.count = 0; t.timer = null; }, 800);
    }
    if (t.count >= 3) {
      if (t.timer) { clearTimeout(t.timer); t.timer = null; }
      t.count = 0;
      hardRefresh();
    }
  };
  return (
    <Box
      onClick={onTap}
      position="fixed" bottom="8px" right="12px" zIndex={1000}
      fontSize="11px" color="gray.600" bg="white" border="1px solid" borderColor="gray.200"
      px="2" py="0.5" borderRadius="md" shadow="sm" cursor="pointer"
      title="Triple-tap to hard refresh"
    >
      {BUILD_VERSION || 'dev'}
    </Box>
  );
}

/** Reusable card section that never overflows horizontally */
function Section({ title, right, children }) {
  return (
    <Box bg="white" p={4} borderRadius="lg" shadow="sm" mb={4} w="100%">
      <HStack justify="space-between" align="center" mb={2} wrap="wrap" spacing={2}>
        <Heading size="sm" noOfLines={1}>{title}</Heading>
        {right}
      </HStack>
      <Divider mb={3} />
      {/* Any wide child (tables) gets its own scroll context */}
      <Box overflowX="auto" w="100%">
        {children}
      </Box>
    </Box>
  );
}

export default function BoardDashboard({ user, onLogout }) {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [windowDays, setWindowDays] = useState('30'); // '7' | '30' | '90' | 'all'

  const [dailyRows, setDailyRows] = useState([]);   // board_labour_daily
  const [rollupRows, setRollupRows] = useState([]); // rollup

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('projects').select('id,name').order('name');
      if (!error) setProjects(data || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const since =
        windowDays === 'all'
          ? null
          : new Date(Date.now() - Number(windowDays) * 24 * 3600 * 1000)
              .toISOString()
              .slice(0, 10);

      let query = supabase.from('board_labour_daily').select('*');
      if (since) query = query.gte('date', since);
      if (selectedProject !== 'all') query = query.eq('project_id', selectedProject);
      query = query.order('date', { ascending: false }).order('project_name', { ascending: true });

      const { data, error } = await query;
      if (error) {
        toast({ title: 'Load failed', description: error.message, status: 'error' });
      } else {
        setDailyRows(data || []);
      }

      // rollup
      if (windowDays === '30' && selectedProject === 'all') {
        const { data: r } = await supabase.from('board_labour_last30').select('*').order('project_name');
        setRollupRows(r || []);
      } else {
        const map = new Map();
        (data || []).forEach(d => {
          const key = d.project_id + '|' + d.project_name;
          const cur = map.get(key) || { project_id: d.project_id, project_name: d.project_name, attendance_30d: 0, allotted_30d: 0 };
          cur.attendance_30d += Number(d.attendance_workers || 0);
          cur.allotted_30d   += Number(d.allotted_workers || 0);
          map.set(key, cur);
        });
        setRollupRows(Array.from(map.values()).sort((a,b)=>a.project_name.localeCompare(b.project_name)));
      }
    })();
  }, [selectedProject, windowDays, toast]);

  const kpis = useMemo(() => {
    let att = 0, allo = 0;
    for (const r of dailyRows) { att += r.attendance_workers || 0; allo += r.allotted_workers || 0; }
    return { att, allo, gap: att - allo };
  }, [dailyRows]);

  const refresh = () => {
    setWindowDays(prev => prev === '30' ? '29' : '30');
    setTimeout(() => setWindowDays('30'), 0);
  };

  return (
    <Box bg="gray.50" minH="100vh" py={8} px={4} overflowX="hidden">
      <Box maxW="800px" mx="auto" w="100%">
        {/* Header */}
        <HStack justify="space-between" mb={4} wrap="wrap" spacing={3}>
          <Heading size="lg" lineHeight="1.15">Board Overview</Heading>
          <HStack wrap="wrap" spacing={2}>
            <Badge colorScheme="purple" variant="subtle" maxW="100%" whiteSpace="normal">
              {user?.email}
            </Badge>
            <Button size="sm" leftIcon={<Icon as={FiLogOut} />} variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </HStack>
        </HStack>

        {/* Controls */}
        <Section title="Controls">
          <Stack direction={{ base:'column', md:'row' }} spacing={3} w="100%">
            <Select value={selectedProject} onChange={(e)=>setSelectedProject(e.target.value)}>
              <option value="all">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Select value={windowDays} onChange={(e)=>setWindowDays(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </Select>
            <Button onClick={refresh} leftIcon={<Icon as={FiRefreshCw} />}>Refresh</Button>
          </Stack>
        </Section>

        {/* KPIs */}
        <SimpleGrid columns={{ base:1, sm:3 }} spacing={3} mb={4}>
          <Stat bg="white" p={4} borderRadius="lg" shadow="sm">
            <StatLabel>Total attendance</StatLabel>
            <StatNumber>{kpis.att.toLocaleString()}</StatNumber>
          </Stat>
          <Stat bg="white" p={4} borderRadius="lg" shadow="sm">
            <StatLabel>Total allotted</StatLabel>
            <StatNumber>{kpis.allo.toLocaleString()}</StatNumber>
          </Stat>
          <Stat bg="white" p={4} borderRadius="lg" shadow="sm">
            <StatLabel>Gap (attendance − allotted)</StatLabel>
            <StatNumber>{kpis.gap.toLocaleString()}</StatNumber>
          </Stat>
        </SimpleGrid>

        {/* Project rollup */}
        <Section title="Project rollup">
          <Table size="sm" variant="simple" width="100%" tableLayout="fixed">
            <Thead>
              <Tr>
                <Th>Project</Th>
                <Th isNumeric>Attendance</Th>
                <Th isNumeric>Allotted</Th>
                <Th isNumeric>Gap</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rollupRows.map(r => (
                <Tr key={r.project_id}>
                  <Td whiteSpace="normal" wordBreak="break-word">{r.project_name}</Td>
                  <Td isNumeric>{Number(r.attendance_30d || 0).toLocaleString()}</Td>
                  <Td isNumeric>{Number(r.allotted_30d || 0).toLocaleString()}</Td>
                  <Td isNumeric>{(Number(r.attendance_30d || 0) - Number(r.allotted_30d || 0)).toLocaleString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Section>

        {/* Daily detail */}
        <Section title="Daily detail">
          <Table size="sm" variant="simple" width="100%" tableLayout="fixed">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Project</Th>
                <Th isNumeric>Attendance</Th>
                <Th isNumeric>Allotted</Th>
                <Th isNumeric>Gap</Th>
              </Tr>
            </Thead>
            <Tbody>
              {dailyRows.map((r, idx) => (
                <Tr key={idx}>
                  <Td>{r.date}</Td>
                  <Td whiteSpace="normal" wordBreak="break-word">{r.project_name}</Td>
                  <Td isNumeric>{r.attendance_workers || 0}</Td>
                  <Td isNumeric>{r.allotted_workers || 0}</Td>
                  <Td isNumeric>{(r.attendance_workers || 0) - (r.allotted_workers || 0)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Section>

        <Text mt={3} fontSize="xs" color="gray.500">
          Data is read-only for board users and reflects attendance vs. allocated labour from work reports.
        </Text>
      </Box>

      <BuildTag />
    </Box>
  );
}