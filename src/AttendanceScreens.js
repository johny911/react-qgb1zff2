// src/AttendanceScreens.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Heading,
  Icon,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { FiRefreshCcw } from 'react-icons/fi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from './supabaseClient';
import { SectionCard } from './components/ui/Kit';
import { BUILD_VERSION } from './version';

// ------- tiny helpers -------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, { retries = 2, delay = 300, factor = 2 } = {}) {
  let last;
  for (let i = 0; i <= retries; i += 1) {
    try { return await fn(); } catch (e) { last = e; }
    await sleep(delay); delay *= factor;
  }
  throw last;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const k = (name, userId) => `ref:${name}:${userId}`;
const getCache = (name, userId) => {
  try {
    const raw = localStorage.getItem(k(name, userId));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.ts || !obj.data) return null;
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
    return obj.data;
  } catch { return null; }
};
const setCache = (name, userId, data) => {
  try { localStorage.setItem(k(name, userId), JSON.stringify({ ts: Date.now(), data })); } catch {}
};

// ======================================================
// useReferenceData: robust projects/teams/types provider
// ======================================================
export function useReferenceData(userKey = 'anon') {
  const mounted = useRef(true);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({}); // { [teamId:string]: Array<{id, team_id, type_name}> }
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // warm from cache instantly
  useEffect(() => {
    const cp = getCache('projects', userKey);
    const ct = getCache('teams', userKey);
    const cty = getCache('types', userKey);
    if (cp) setProjects(cp);
    if (ct) setTeams(ct);
    if (cty) setTypes(cty);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [pRes, tRes, tyRes] = await withRetry(
        () => Promise.all([
          supabase.from('projects').select('id,name').order('name'),
          supabase.from('labour_teams').select('id,name').order('name'),
          supabase.from('labour_types').select('id,team_id,type_name').order('team_id').order('type_name'),
        ]),
        { retries: 2, delay: 250 }
      );

      const p = pRes.data || [];
      const t = tRes.data || [];
      const ty = tyRes.data || [];

      // map types keyed by **string** team id (prevents key mismatch)
      const map = {};
      for (const x of ty) {
        const key = String(x.team_id);
        (map[key] = map[key] || []).push(x);
      }

      if (!mounted.current) return;
      setProjects(p);
      setTeams(t);
      setTypes(map);

      setCache('projects', userKey, p);
      setCache('teams', userKey, t);
      setCache('types', userKey, map);
    } catch (e) {
      if (!mounted.current) return;
      setError(e?.message || 'Failed to load reference data');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userKey]);

  // first fetch (after warm cache)
  useEffect(() => {
    mounted.current = true;
    reload();
    return () => { mounted.current = false; };
  }, [reload]);

  // refresh on visibility/focus if we’re empty (handles background resume)
  useEffect(() => {
    const need = () =>
      (projects?.length || 0) === 0 ||
      (teams?.length || 0) === 0 ||
      (Object.keys(types || {}).length || 0) === 0;

    const onVis = () => { if (document.visibilityState === 'visible' && need() && !loading) reload(); };
    const onFocus = () => { if (need() && !loading) reload(); };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [projects, teams, types, loading, reload]);

  return { projects, teams, types, loading, error, reload };
}

// ======================================================
// Build / version badge (unchanged from your original)
// ======================================================
export function BuildTag() {
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
      position="fixed"
      bottom="8px"
      right="12px"
      fontSize="11px"
      color="gray.600"
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      px="2"
      py="0.5"
      borderRadius="md"
      shadow="sm"
      opacity={0.95}
      zIndex={1000}
      cursor="pointer"
      title="Triple-tap to hard refresh"
      aria-label="Build version badge"
    >
      {BUILD_VERSION || 'dev'}
    </Box>
  );
}

// ======================================================
// ViewAttendance screen
// ======================================================
export function ViewAttendance({
  refData,
  projectId, setProjectId,
  date, setDate,
  onBack,
}) {
  const toast = useToast();
  const [rows, setRows] = useState([]);

  const fetchAttendance = async () => {
    if (!projectId || !date) {
      toast({ title: 'Select project & date', status: 'info', duration: 1500 });
      return;
    }
    const { data, error } = await supabase
      .from('attendance')
      .select('count, labour_teams(name), labour_types(type_name)')
      .eq('project_id', projectId)
      .eq('date', date);

    if (error) {
      toast({ title: 'Load failed', description: error.message, status: 'error' });
    } else {
      setRows(data || []);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const projectName = refData.projects.find(p => String(p.id) === String(projectId))?.name || 'N/A';
    doc.setFontSize(14);
    doc.text('Attendance Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Project: ${projectName}`, 14, 28);
    doc.text(`Date: ${date}`, 14, 34);
    const body = rows.map(r => [r.labour_teams.name, r.labour_types.type_name, r.count]);
    doc.autoTable({ startY: 40, head: [['Team', 'Type', 'Count']], body });
    doc.save(`Attendance-${projectName}-${date}.pdf`);
  };

  return (
    <Stack spacing={4}>
      <Heading size="sm">View Attendance</Heading>

      <Select
        placeholder={refData.loading ? 'Loading projects…' : 'Select Project'}
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        isDisabled={refData.loading || (refData.projects?.length || 0) === 0}
      >
        {refData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>

      <HStack justify="space-between">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button
          size="sm"
          leftIcon={<Icon as={FiRefreshCcw} />}
          variant="ghost"
          onClick={() => refData.reload()}
          isLoading={refData.loading}
        >
          Reload
        </Button>
      </HStack>

      {refData.error && <Text color="red.500" fontSize="sm">{refData.error}</Text>}

      <Button colorScheme="blue" onClick={fetchAttendance}>View</Button>

      <Stack pt={2} spacing={2}>
        {rows.map((r, i) => (
          <Text key={i}>
            {r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos
          </Text>
        ))}
      </Stack>

      {rows.length > 0 && (
        <Button colorScheme="green" onClick={downloadPDF}>Download as PDF</Button>
      )}

      <Button variant="outline" onClick={onBack}>← Back</Button>
    </Stack>
  );
}

// ======================================================
// EnterAttendance screen
// ======================================================
export function EnterAttendance({
  refData,
  projectId, setProjectId,
  date, setDate,
  rows, setRows,
  onBack,
}) {
  const toast = useToast();
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const isEditing = attendanceExists;

  // load attendance for (project,date)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!projectId || !date) {
        if (alive) { setAttendanceExists(false); setEditMode(true); }
        return;
      }
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', projectId)
        .eq('date', date);

      if (!alive) return;
      if (error) {
        setAttendanceExists(false);
        setEditMode(true);
        setRows([{ teamId: '', typeId: '', count: '' }]);
        return;
      }
      if ((data || []).length > 0) {
        setAttendanceExists(true);
        setEditMode(false);
        setRows(data.map(r => ({
          teamId: String(r.team_id),
          typeId: String(r.labour_type_id),
          count: String(r.count ?? ''),
        })));
      } else {
        setAttendanceExists(false);
        setEditMode(true);
        setRows([{ teamId: '', typeId: '', count: '' }]);
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, date]);

  // helpers
  const isRowValid = (r) =>
    r.teamId && r.typeId && r.count && !Number.isNaN(parseInt(r.count, 10)) && parseInt(r.count, 10) > 0;
  const canSave = () => projectId && date && rows.length > 0 && rows.every(isRowValid);
  const totalCount = rows.reduce((s, r) => s + (parseInt(r.count || '0', 10) || 0), 0);

  // handlers
  const onChangeRow = (i, field, value) => {
    const next = [...rows];
    next[i][field] = value;
    if (field === 'teamId') next[i].typeId = '';
    setRows(next);
  };
  const onChangeCount = (i, value) => {
    const val = String(value ?? '').replace(/[^\d]/g, '');
    onChangeRow(i, 'count', val);
  };
  const addRow = () => setRows([...rows, { teamId: '', typeId: '', count: '' }]);
  const removeRow = (i) => {
    const copy = [...rows];
    copy.splice(i, 1);
    setRows(copy.length ? copy : [{ teamId: '', typeId: '', count: '' }]);
  };

  const handleSubmit = async () => {
    if (!canSave()) {
      toast({
        title: 'Please complete all fields.',
        description: 'Project, date, team, type, and a positive count are required.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    const del = await supabase.from('attendance').delete().eq('project_id', projectId).eq('date', date);
    if (del.error) {
      toast({ title: 'Save failed (delete)', description: del.error.message, status: 'error' });
      return;
    }

    const payload = rows.map(r => ({
      project_id: projectId,
      date,
      team_id: r.teamId,
      labour_type_id: r.typeId,
      count: parseInt(r.count, 10),
    }));
    const ins = await supabase.from('attendance').insert(payload);
    if (ins.error) {
      toast({ title: 'Save failed (insert)', description: ins.error.message, status: 'error' });
      return;
    }

    toast({
      title: isEditing ? 'Attendance updated' : 'Attendance saved',
      description: `${totalCount} entries for ${date}.`,
      status: 'success',
      duration: 2000,
    });
    setAttendanceExists(true);
    setEditMode(false);
  };

  return (
    <Stack spacing={5}>
      <Flex align="center" justify="space-between">
        <Heading size="sm">Enter Attendance</Heading>
        <Badge colorScheme={isEditing ? 'purple' : 'yellow'} variant="subtle">
          {isEditing ? 'Editing existing attendance' : 'Draft'}
        </Badge>
      </Flex>

      <SectionCard title="Details" subtitle="Select project and date.">
        <Stack spacing={3}>
          <Box>
            <Text fontSize="sm" color="textMuted" mb={1}>Project</Text>
            <HStack>
              <Select
                placeholder={refData.loading ? 'Loading projects…' : 'Select Project'}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                isDisabled={!editMode || refData.loading || (refData.projects?.length || 0) === 0}
              >
                {refData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Button
                size="sm"
                leftIcon={<Icon as={FiRefreshCcw} />}
                variant="ghost"
                onClick={() => refData.reload()}
                isLoading={refData.loading}
              >
                Reload
              </Button>
            </HStack>
            {refData.error && <Text color="red.500" fontSize="xs" mt={1}>{refData.error}</Text>}
          </Box>

          <Box>
            <Text fontSize="sm" color="textMuted" mb={1}>Date</Text>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              isDisabled={!editMode}
            />
          </Box>

          {isEditing && !editMode && (
            <Flex align="center" justify="space-between" pt={1}>
              <Text color="green.600" fontSize="sm">✅ Attendance already exists for this date.</Text>
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
            </Flex>
          )}
        </Stack>
      </SectionCard>

      <SectionCard title="Entries" subtitle="Add team, type and count for today.">
        <Stack spacing={3}>
          {rows.map((r, i) => {
            const teamTypes = refData.types[String(r.teamId)] || []; // STRING KEY
            return (
              <Box key={i} bg="gray.50" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Stack spacing={2}>
                  <Box>
                    <Text fontSize="sm" color="textMuted" mb={1}>Team</Text>
                    <Select
                      placeholder={refData.loading ? 'Loading teams…' : 'Select Team'}
                      value={r.teamId}
                      onChange={(e) => onChangeRow(i, 'teamId', e.target.value)}
                      isDisabled={!editMode || refData.loading || (refData.teams?.length || 0) === 0}
                    >
                      {refData.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="textMuted" mb={1}>Type</Text>
                    <Select
                      placeholder={r.teamId ? 'Select Type' : 'Select team first'}
                      value={r.typeId}
                      onChange={(e) => onChangeRow(i, 'typeId', e.target.value)}
                      isDisabled={!editMode || !r.teamId}
                    >
                      {teamTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                    </Select>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="textMuted" mb={1}>Count</Text>
                    <NumberInput
                      min={1}
                      value={r.count}
                      onChange={(_, val) => onChangeCount(i, String(val ?? ''))}
                      isDisabled={!editMode}
                    >
                      <NumberInputField placeholder="Enter count" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Box>

                  {!isRowValid(r) && editMode && (
                    <Text fontSize="xs" color="red.500">Complete team, type and a positive count.</Text>
                  )}

                  <Flex justify="flex-end">
                    <Button
                      size="xs"
                      colorScheme="red"
                      onClick={() => removeRow(i)}
                      visibility={editMode ? 'visible' : 'hidden'}
                    >
                      Remove
                    </Button>
                  </Flex>
                </Stack>
              </Box>
            );
          })}

          {editMode && (
            <Button onClick={addRow} variant="outline">+ Add Entry</Button>
          )}
        </Stack>

        <Divider my={4} />

        <Stack spacing={1} mb={2}>
          <Heading size="xs">Summary</Heading>
          {rows.map((r, i) => {
            const teamName = refData.teams.find(t => String(t.id) === String(r.teamId))?.name || '—';
            const typeName = (refData.types[String(r.teamId)] || []).find(x => String(x.id) === String(r.typeId))?.type_name || '—';
            const count = r.count || '0';
            return <Text key={i} fontSize="sm">{teamName} – {typeName} – {count} nos</Text>;
          })}
        </Stack>

        <Box mt={4} width="100%">
          <Button colorScheme="brand" width="100%" size="lg" onClick={handleSubmit} isDisabled={!canSave() || !editMode}>
            {isEditing ? '💾 Update Attendance' : '✅ Save Attendance'}
          </Button>
          <Button variant="outline" width="100%" mt={3} onClick={onBack}>← Back</Button>
        </Box>
      </SectionCard>
    </Stack>
  );
}