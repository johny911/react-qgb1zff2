// src/BoardDashboard.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Heading, Text, HStack, VStack, Stack, Select, Button, Badge,
  SimpleGrid, Stat, StatLabel, StatNumber, Table, Thead, Tbody, Tr, Th, Td,
  useToast, Icon, Divider, Input, Switch, FormControl, FormLabel
} from '@chakra-ui/react';
import { supabase } from './supabaseClient';
import { BUILD_VERSION } from './version';
import { FiRefreshCw, FiLogOut } from 'react-icons/fi';

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
    if (t.count === 1) t.timer = setTimeout(() => { t.count = 0; t.timer = null; }, 800);
    if (t.count >= 3) { if (t.timer) clearTimeout(t.timer); t.count = 0; hardRefresh(); }
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

export default function BoardDashboard({ user, onLogout }) {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [windowDays, setWindowDays] = useState('30'); // '7' | '30' | '90' | 'all'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0,10));
  const [showAllotted, setShowAllotted] = useState(true);

  const [dailyRows, setDailyRows] = useState([]);        // board_labour_daily
  const [rollupRows, setRollupRows] = useState([]);      // last30 or client rollup
  const [breakdownRows, setBreakdownRows] = useState([]); // board_project_day_breakdown (per-project)
  const [glanceRows, setGlanceRows] = useState([]);      // board_project_day_breakdown (all projects for date)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('projects').select('id,name').order('name');
      if (!error) setProjects(data || []);
    })();
  }, []);

  // Portfolio daily/rollup
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

  // Per-project / per-day breakdown
  useEffect(() => {
    (async () => {
      if (selectedProject === 'all' || !selectedDate) {
        setBreakdownRows([]);
        return;
      }
      const { data, error } = await supabase
        .from('board_project_day_breakdown')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('date', selectedDate)
        .order('team_name', { ascending: true })
        .order('labour_type_name', { ascending: true });
      if (error) {
        toast({ title: 'Breakdown failed', description: error.message, status: 'error' });
      } else {
        setBreakdownRows(data || []);
      }
    })();
  }, [selectedProject, selectedDate, toast]);

  // All-projects glance for a given date
  useEffect(() => {
    (async () => {
      if (selectedProject !== 'all' || !selectedDate) {
        setGlanceRows([]);
        return;
      }
      const { data, error } = await supabase
        .from('board_project_day_breakdown')
        .select('*')
        .eq('date', selectedDate)
        .order('project_name', { ascending: true })
        .order('team_name', { ascending: true })
        .order('labour_type_name', { ascending: true });
      if (error) {
        toast({ title: 'Load failed', description: error.message, status: 'error' });
      } else {
        setGlanceRows(data || []);
      }
    })();
  }, [selectedProject, selectedDate, toast]);

  // KPI across visible set
  const kpis = useMemo(() => {
    let att = 0, allo = 0;
    for (const r of dailyRows) { att += r.attendance_workers || 0; allo += r.allotted_workers || 0; }
    return { att, allo, gap: att - allo };
  }, [dailyRows]);

  const refresh = () => {
    setWindowDays(prev => prev === '30' ? '29' : '30');
    setTimeout(() => setWindowDays('30'), 0);
  };

  // Totals for the per-project insight panel
  const insightTotals = useMemo(() => {
    let att = 0, allo = 0;
    for (const r of breakdownRows) { att += r.attendance_count || 0; allo += r.allotted_count || 0; }
    return { att, allo, gap: att - allo };
  }, [breakdownRows]);

  // Group the glance rows by project
  const glanceByProject = useMemo(() => {
    const map = new Map();
    for (const r of glanceRows) {
      const key = r.project_id + '|' + r.project_name;
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }
    // Convert to array of { project_id, project_name, rows, totals }
    return Array.from(map.entries()).map(([k, rows]) => {
      const [project_id, project_name] = k.split('|');
      let att = 0, allo = 0;
      rows.forEach(x => { att += x.attendance_count || 0; allo += x.allotted_count || 0; });
      return { project_id, project_name, rows, totals: { att, allo, gap: att - allo } };
    });
  }, [glanceRows]);

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={4} wrap="wrap" gap={2}>
        <Heading size="lg">Board Overview</Heading>
        <HStack>
          <Badge colorScheme="purple" variant="subtle">{user?.email}</Badge>
          <Button size="sm" leftIcon={<Icon as={FiLogOut} />} variant="outline" onClick={onLogout}>Logout</Button>
        </HStack>
      </HStack>

      {/* Portfolio controls */}
      <Stack direction={{ base:'column', md:'row' }} spacing={3} mb={4}>
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

      {/* Portfolio KPIs */}
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

      {/* AT-A-GLANCE across ALL projects for a chosen date */}
      {selectedProject === 'all' && (
        <Section title="At-a-glance (all projects for date)">
          <HStack spacing={4} mb={3} wrap="wrap">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e)=>setSelectedDate(e.target.value)}
              max={new Date().toISOString().slice(0,10)}
              w="auto"
            />
            <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel htmlFor="showAllotted" mb="0" fontSize="sm" color="gray.700">
                Show allotted column
              </FormLabel>
              <Switch id="showAllotted" isChecked={showAllotted} onChange={(e)=>setShowAllotted(e.target.checked)} />
            </FormControl>
            <Text fontSize="sm" color="gray.600">Team → Type → Count per project in one glance.</Text>
          </HStack>

          <SimpleGrid columns={{ base:1, md:2 }} spacing={4}>
            {glanceByProject.map(pj => (
              <Box key={pj.project_id} bg="white" p={4} borderRadius="lg" shadow="sm">
                <HStack justify="space-between" mb={2}>
                  <Heading size="sm">{pj.project_name}</Heading>
                  <HStack spacing={2}>
                    <Badge colorScheme="blue">Att: {pj.totals.att}</Badge>
                    {showAllotted && <Badge colorScheme="purple">Allot: {pj.totals.allo}</Badge>}
                    <Badge colorScheme={pj.totals.gap >= 0 ? 'green' : 'red'}>
                      Gap: {pj.totals.gap}
                    </Badge>
                  </HStack>
                </HStack>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Team</Th>
                      <Th>Type</Th>
                      <Th isNumeric>Count</Th>
                      {showAllotted && <Th isNumeric>Allotted</Th>}
                      <Th isNumeric>Gap</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {pj.rows.map((r, idx) => (
                      <Tr key={idx}>
                        <Td>{r.team_name || '—'}</Td>
                        <Td>{r.labour_type_name || '—'}</Td>
                        <Td isNumeric>{r.attendance_count || 0}</Td>
                        {showAllotted && <Td isNumeric>{r.allotted_count || 0}</Td>}
                        <Td isNumeric>{(r.attendance_count || 0) - (r.allotted_count || 0)}</Td>
                      </Tr>
                    ))}
                    {pj.rows.length === 0 && (
                      <Tr><Td colSpan={showAllotted ? 5 : 4}><Text fontSize="sm" color="gray.500">No data.</Text></Td></Tr>
                    )}
                  </Tbody>
                </Table>
              </Box>
            ))}
          </SimpleGrid>
        </Section>
      )}

      {/* Project insight — appears when a single project is selected */}
      {selectedProject !== 'all' && (
        <Section title="Project insight (by team & labour type)">
          <HStack spacing={3} mb={3} wrap="wrap">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e)=>setSelectedDate(e.target.value)}
              max={new Date().toISOString().slice(0,10)}
              w="auto"
            />
            <Text fontSize="sm" color="gray.600">Compare attendance vs. allotted for the day.</Text>
          </HStack>

          <SimpleGrid columns={{ base:1, sm:3 }} spacing={3} mb={3}>
            <Stat bg="gray.50" p={3} borderRadius="md">
              <StatLabel>Attendance (total)</StatLabel>
              <StatNumber>{insightTotals.att.toLocaleString()}</StatNumber>
            </Stat>
            <Stat bg="gray.50" p={3} borderRadius="md">
              <StatLabel>Allotted (total)</StatLabel>
              <StatNumber>{insightTotals.allo.toLocaleString()}</StatNumber>
            </Stat>
            <Stat bg="gray.50" p={3} borderRadius="md">
              <StatLabel>Gap (att − allot)</StatLabel>
              <StatNumber>{insightTotals.gap.toLocaleString()}</StatNumber>
            </Stat>
          </SimpleGrid>

          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Team</Th>
                <Th>Type</Th>
                <Th isNumeric>Attendance</Th>
                <Th isNumeric>Allotted</Th>
                <Th isNumeric>Gap</Th>
              </Tr>
            </Thead>
            <Tbody>
              {breakdownRows.map((r, i) => (
                <Tr key={`${r.team_id}-${r.labour_type_id}-${i}`}>
                  <Td>{r.team_name || '—'}</Td>
                  <Td>{r.labour_type_name || '—'}</Td>
                  <Td isNumeric>{r.attendance_count || 0}</Td>
                  <Td isNumeric>{r.allotted_count || 0}</Td>
                  <Td isNumeric>{(r.attendance_count || 0) - (r.allotted_count || 0)}</Td>
                </Tr>
              ))}
              {breakdownRows.length === 0 && (
                <Tr><Td colSpan={5}><Text fontSize="sm" color="gray.500">No data for this date.</Text></Td></Tr>
              )}
            </Tbody>
          </Table>
        </Section>
      )}

      {/* Per-project rollup for the selected portfolio window */}
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
            {rollupRows.map(r => (
              <Tr key={r.project_id}>
                <Td>{r.project_name}</Td>
                <Td isNumeric>{Number(r.attendance_30d || 0).toLocaleString()}</Td>
                <Td isNumeric>{Number(r.allotted_30d || 0).toLocaleString()}</Td>
                <Td isNumeric>{(Number(r.attendance_30d || 0) - Number(r.allotted_30d || 0)).toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Section>

      {/* Daily detail for the portfolio window */}
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
              <Tr key={idx}>
                <Td>{r.date}</Td>
                <Td>{r.project_name}</Td>
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

      <BuildTag />
    </Box>
  );
}

function Section({ title, children }) {
  return (
    <Box bg="white" p={4} borderRadius="lg" shadow="sm" mb={4}>
      <HStack justify="space-between" mb={2}>
        <Heading size="sm">{title}</Heading>
      </HStack>
      <Divider mb={3}/>
      {children}
    </Box>
  );
}