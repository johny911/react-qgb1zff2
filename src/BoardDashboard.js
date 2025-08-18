// src/BoardDashboard.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box, Heading, Text, HStack, VStack, Stack, Select, Button, Badge,
  SimpleGrid, Stat, StatLabel, StatNumber, Table, Thead, Tbody, Tr, Th, Td,
  useToast, Icon, Divider, Spinner
} from '@chakra-ui/react';
import { supabase } from './supabaseClient';
import { BUILD_VERSION } from './version';
import { FiRefreshCw, FiLogOut } from 'react-icons/fi';

/* ──────────────────────────────────────────────────────────────
   Small build/version badge with triple-tap hard refresh
   ────────────────────────────────────────────────────────────── */
function BuildTag() {
  const tapsRef = useRef({ count: 0, timer: null });

  const hardRefresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (r) => {
            try { await r.update(); } catch {}
            try { await r.unregister(); } catch {}
          })
        );
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
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

/* ────────────────────────────────────────────────────────────── */

export default function BoardDashboard({ user, onLogout }) {
  const toast = useToast();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [windowDays, setWindowDays] = useState('30'); // '7' | '30' | '90' | 'all'

  const [dailyRows, setDailyRows] = useState([]);   // from board_labour_daily
  const [rollupRows, setRollupRows] = useState([]); // from view or client rollup
  const [loading, setLoading] = useState(false);

  // Load projects once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('projects').select('id,name').order('name');
      if (error) {
        toast({ title: 'Failed to load projects', description: error.message, status: 'error' });
      } else {
        setProjects(data || []);
      }
    })();
  }, [toast]);

  // Fetch data any time filters change
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const since =
        windowDays === 'all'
          ? null
          : new Date(Date.now() - Number(windowDays) * 24 * 3600 * 1000)
              .toISOString()
              .slice(0, 10);

      // Daily series
      let q = supabase.from('board_labour_daily').select('*');
      if (since) q = q.gte('date', since);
      if (selectedProject !== 'all') q = q.eq('project_id', selectedProject);
      q = q.order('date', { ascending: false }).order('project_name', { ascending: true });

      const { data: daily, error: dailyErr } = await q;
      if (dailyErr) {
        toast({ title: 'Failed to load daily data', description: dailyErr.message, status: 'error' });
        setDailyRows([]);
      } else {
        setDailyRows(daily || []);
      }

      // Rollup:
      // If "last 30 days" and "all projects", use the view; otherwise compute client-side.
      if (windowDays === '30' && selectedProject === 'all') {
        const { data: r, error: rErr } = await supabase
          .from('board_labour_last30')
          .select('*')
          .order('project_name');
        if (rErr) {
          // Fall back to client rollup on view failure
          setRollupRows(rollupClient(daily || []));
        } else {
          setRollupRows(
            (r || []).map((row) => ({
              ...row,
              attendance_30d: Number(row.attendance_30d || 0),
              allotted_30d: Number(row.allotted_30d || 0),
            }))
          );
        }
      } else {
        setRollupRows(rollupClient(daily || []));
      }
    } finally {
      setLoading(false);
    }
  }, [windowDays, selectedProject, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KPI totals across the visible set
  const kpis = useMemo(() => {
    let att = 0, allo = 0;
    for (const r of dailyRows) {
      att += Number(r.attendance_workers || 0);
      allo += Number(r.allotted_workers || 0);
    }
    return { att, allo, gap: att - allo };
  }, [dailyRows]);

  const onRefresh = () => loadData();

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={4} wrap="wrap" gap={2}>
        <Heading size="lg">Board Overview</Heading>
        <HStack>
          <Badge colorScheme="purple" variant="subtle">{user?.email}</Badge>
          <Button size="sm" leftIcon={<Icon as={FiLogOut} />} variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </HStack>
      </HStack>

      {/* Controls */}
      <Stack direction={{ base:'column', md:'row' }} spacing={3} mb={4}>
        <Select value={selectedProject} onChange={(e)=>setSelectedProject(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
        </Select>
        <Select value={windowDays} onChange={(e)=>setWindowDays(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </Select>
        <Button onClick={onRefresh} leftIcon={<Icon as={FiRefreshCw} />}>Refresh</Button>
      </Stack>

      {loading ? (
        <VStack py={10}>
          <Spinner size="lg" />
          <Text fontSize="sm" color="gray.500">Loading summary…</Text>
        </VStack>
      ) : (
        <>
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

          {/* Per-project rollup */}
          <Section title="Project rollup">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Project</Th>
                  <Th isNumeric>Attendance</Th>
                  <Th isNumeric>Allotted</Th>
                  <Th isNumeric>Gap</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rollupRows.map((r) => (
                  <Tr key={r.project_id}>
                    <Td>{r.project_name}</Td>
                    <Td isNumeric>{Number(r.attendance_30d || 0).toLocaleString()}</Td>
                    <Td isNumeric>{Number(r.allotted_30d || 0).toLocaleString()}</Td>
                    <Td isNumeric>{(Number(r.attendance_30d || 0) - Number(r.allotted_30d || 0)).toLocaleString()}</Td>
                  </Tr>
                ))}
                {rollupRows.length === 0 && (
                  <Tr><Td colSpan={4}><Text fontSize="sm" color="gray.500">No data in this range.</Text></Td></Tr>
                )}
              </Tbody>
            </Table>
          </Section>

          {/* Daily detail */}
          <Section title="Daily detail">
            <Table size="sm">
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
                  <Tr key={`${r.project_id}-${r.date}-${idx}`}>
                    <Td>{r.date}</Td>
                    <Td>{r.project_name}</Td>
                    <Td isNumeric>{Number(r.attendance_workers || 0)}</Td>
                    <Td isNumeric>{Number(r.allotted_workers || 0)}</Td>
                    <Td isNumeric>{Number(r.attendance_workers || 0) - Number(r.allotted_workers || 0)}</Td>
                  </Tr>
                ))}
                {dailyRows.length === 0 && (
                  <Tr><Td colSpan={5}><Text fontSize="sm" color="gray.500">No daily rows found.</Text></Td></Tr>
                )}
              </Tbody>
            </Table>
          </Section>

          <Text mt={3} fontSize="xs" color="gray.500">
            Data is read-only for board users and reflects attendance vs. allocated labour from work reports.
          </Text>
        </>
      )}

      <BuildTag />
    </Box>
  );
}

/* ────────────────────────────────────────────────────────────── */

function Section({ title, children }) {
  return (
    <Box bg="white" p={4} borderRadius="lg" shadow="sm" mb={4} overflowX="auto">
      <HStack justify="space-between" mb={2}>
        <Heading size="sm">{title}</Heading>
      </HStack>
      <Divider mb={3}/>
      {children}
    </Box>
  );
}

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function rollupClient(daily) {
  const map = new Map();
  for (const d of daily) {
    const key = `${d.project_id}|${d.project_name}`;
    const cur = map.get(key) || {
      project_id: d.project_id,
      project_name: d.project_name,
      attendance_30d: 0,
      allotted_30d: 0
    };
    cur.attendance_30d += Number(d.attendance_workers || 0);
    cur.allotted_30d   += Number(d.allotted_workers || 0);
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.project_name.localeCompare(b.project_name));
}