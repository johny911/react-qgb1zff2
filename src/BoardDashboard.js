// src/BoardDashboard.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Heading, Text, HStack, Stack, Select, Button, Badge,
  SimpleGrid, Stat, StatLabel, StatNumber, Table, Thead, Tbody, Tr, Th, Td,
  useToast, Icon, Divider, Tabs, TabList, TabPanels, Tab, TabPanel
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
        await Promise.all(
          regs.map(async r => {
            try { await r.update(); } catch {}
            try { await r.unregister(); } catch {}
          })
        );
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

/** Reusable card section with safe overflow */
function Section({ title, right, children }) {
  return (
    <Box bg="white" p={4} borderRadius="lg" shadow="sm" mb={4} w="100%">
      <HStack justify="space-between" align="center" mb={2} wrap="wrap" spacing={2}>
        <Heading size="sm" noOfLines={1}>{title}</Heading>
        {right}
      </HStack>
      <Divider mb={3} />
      <Box overflowX="auto" w="100%">
        {children}
      </Box>
    </Box>
  );
}

export default function BoardDashboard({ user, onLogout }) {
  const toast = useToast();

  // -------- Shared filters (top bar) --------
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');

  // Overview range
  const [windowDays, setWindowDays] = useState('30'); // 7|30|90|all

  // Attendance-at-a-glance date
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // -------- Data --------
  const [dailyRows, setDailyRows] = useState([]);    // board_labour_daily
  const [rollupRows, setRollupRows] = useState([]);  // rollup from dailyRows or view
  const [breakdownRows, setBreakdownRows] = useState([]); // board_attendance_breakdown for selectedDate

  // Load projects once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('projects').select('id,name').order('name');
      if (!error) setProjects(data || []);
    })();
  }, []);

  // -------- Overview fetch (project + windowDays) --------
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

  // -------- Breakdown fetch (project + date) --------
  useEffect(() => {
    (async () => {
      let q = supabase.from('board_attendance_breakdown').select('*').eq('date', selectedDate);
      if (selectedProject !== 'all') q = q.eq('project_id', selectedProject);
      q = q.order('project_name').order('team_name').order('type_name');
      const { data, error } = await q;
      if (error) {
        toast({ title: 'Load failed', description: error.message, status: 'error' });
      } else {
        setBreakdownRows(data || []);
      }
    })();
  }, [selectedDate, selectedProject, toast]);

  // KPIs for overview
  const kpis = useMemo(() => {
    let att = 0, allo = 0;
    for (const r of dailyRows) { att += r.attendance_workers || 0; allo += r.allotted_workers || 0; }
    return { att, allo, gap: att - allo };
  }, [dailyRows]);

  const refreshAll = () => {
    setWindowDays(prev => prev === '30' ? '29' : '30');
    setTimeout(() => setWindowDays('30'), 0);
  };

  // Group breakdown by project
  const groupedByProject = useMemo(() => {
    const map = new Map();
    for (const r of breakdownRows) {
      if (!map.has(r.project_id)) {
        map.set(r.project_id, { name: r.project_name, rows: [], total: 0 });
      }
      const bucket = map.get(r.project_id);
      bucket.rows.push(r);
      bucket.total += Number(r.count || 0);
    }
    return Array.from(map.entries())
      .map(([project_id, v]) => ({ project_id, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [breakdownRows]);

  return (
    <Box bg="gray.50" minH="100vh" py={8} px={4} overflowX="hidden">
      <Box maxW="800px" mx="auto" w="100%">
        {/* Header */}
        <HStack justify="space-between" mb={4} wrap="wrap" spacing={3}>
          <Heading size="lg" lineHeight="1.15">Board</Heading>
          <HStack wrap="wrap" spacing={2}>
            <Badge colorScheme="purple" variant="subtle" maxW="100%" whiteSpace="normal">
              {user?.email}
            </Badge>
            <Button size="sm" leftIcon={<Icon as={FiLogOut} />} variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </HStack>
        </HStack>

        {/* ======= COMMON FILTER BAR ======= */}
        <Section title="Filters">
          <Stack direction={{ base:'column', md:'row' }} spacing={3} w="100%" align="stretch">
            <Select value={selectedProject} onChange={(e)=>setSelectedProject(e.target.value)}>
              <option value="all">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>

            {/* Overview range */}
            <Select value={windowDays} onChange={(e)=>setWindowDays(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </Select>

            <Button onClick={refreshAll} leftIcon={<Icon as={FiRefreshCw} />}>Refresh</Button>

            {/* Date controls (Attendance tab) */}
            <Button onClick={() => setSelectedDate(todayStr)}>Today</Button>
            <Box as="label" display="flex" alignItems="center" gap="8px">
              <Text fontSize="sm" color="gray.600" minW="60px">Date</Text>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  height: '36px',
                  padding: '6px 10px',
                  border: '1px solid var(--chakra-colors-gray-200)',
                  borderRadius: '8px'
                }}
              />
            </Box>
          </Stack>
        </Section>

        {/* ======= TABS: default to Attendance ======= */}
        <Tabs colorScheme="brand" variant="enclosed" defaultIndex={1}>
          <TabList overflowX="auto">
            <Tab>Overview</Tab>
            <Tab>Attendance at a glance</Tab>
          </TabList>

          <TabPanels>
            {/* -------- OVERVIEW TAB -------- */}
            <TabPanel px={0}>
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
            </TabPanel>

            {/* -------- ATTENDANCE AT A GLANCE TAB -------- */}
            <TabPanel px={0}>
              <Section
                title={`Attendance at a glance — ${selectedDate}`}
                right={<Badge colorScheme="blue">Team → Type → Count</Badge>}
              >
                {groupedByProject.length === 0 ? (
                  <Text color="gray.500" fontSize="sm">No attendance for this date.</Text>
                ) : (
                  <Stack spacing={4}>
                    {groupedByProject.map(p => (
                      <Box key={p.project_id} p={3} border="1px solid" borderColor="gray.200" borderRadius="lg">
                        <HStack justify="space-between" mb={2} wrap="wrap">
                          <Heading size="sm" whiteSpace="normal">{p.name}</Heading>
                          <Badge colorScheme="blue">Total: {p.total}</Badge>
                        </HStack>
                        <Box overflowX="auto">
                          <Table size="sm" width="100%" tableLayout="fixed">
                            <Thead>
                              <Tr>
                                <Th>Team</Th>
                                <Th>Type</Th>
                                <Th isNumeric>Count</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {p.rows.map((r, i) => (
                                <Tr key={i}>
                                  <Td whiteSpace="normal" wordBreak="break-word">{r.team_name || '—'}</Td>
                                  <Td whiteSpace="normal" wordBreak="break-word">{r.type_name || '—'}</Td>
                                  <Td isNumeric>{r.count || 0}</Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Section>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Text mt={3} fontSize="xs" color="gray.500">
          Overview uses the range selector; “Attendance at a glance” uses the date picker above.
        </Text>
      </Box>

      <BuildTag />
    </Box>
  );
}