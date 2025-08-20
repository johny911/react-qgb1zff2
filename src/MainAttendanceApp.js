// src/MainAttendanceApp.js
import React, { useEffect, useRef, useState } from 'react'
import { SectionCard, ActionButton } from './components/ui/Kit'
import {
  Box, Button, Select, Input, Heading, Text, Stack, Flex, Divider, Badge,
  useToast, HStack, Icon, Spinner
} from '@chakra-ui/react'
import { FiRefreshCcw } from 'react-icons/fi'
import { supabase } from './supabaseClient'
import WorkReport from './WorkReport'
import ViewWorkReports from './ViewWorkReports'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import usePersistedState from './hooks/usePersistedState'
import { BUILD_VERSION } from './version'
import AttendanceEntry from './attendance/AttendanceEntry'

// --- tiny utils ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function withRetry(fn, { retries = 2, delay = 250, factor = 2 } = {}) {
  let last
  for (let i = 0; i <= retries; i++) {
    try { return await fn() } catch (e) { last = e }
    await sleep(delay); delay *= factor
  }
  throw last
}

const TTL_MS = 10 * 60 * 1000
const cacheKey = (name, uid) => `ref:${name}:${uid || 'anon'}`
const loadCache = (name, uid) => {
  try {
    const raw = sessionStorage.getItem(cacheKey(name, uid))
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (!obj || !obj.ts) return null
    if (Date.now() - obj.ts > TTL_MS) return null
    return obj.data
  } catch { return null }
}
const saveCache = (name, uid, data) => {
  try {
    sessionStorage.setItem(cacheKey(name, uid), JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

// Build/version badge with triple-tap hard refresh
function BuildTag() {
  const tapsRef = useRef({ count: 0, timer: null })
  const hardRefresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(async r => { try { await r.update() } catch {} try { await r.unregister() } catch {} }))
      }
      if (window.caches) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } finally {
      window.location.replace(window.location.href.split('#')[0])
    }
  }
  const onTap = () => {
    const t = tapsRef.current
    t.count += 1
    if (t.count === 1) {
      t.timer = setTimeout(() => { t.count = 0; t.timer = null }, 800)
    }
    if (t.count >= 3) {
      if (t.timer) { clearTimeout(t.timer); t.timer = null }
      t.count = 0
      hardRefresh()
    }
  }
  return (
    <Box
      onClick={onTap}
      position="fixed" bottom="8px" right="12px"
      fontSize="11px" color="gray.600" bg="white"
      border="1px solid" borderColor="gray.200"
      px="2" py="0.5" borderRadius="md" shadow="sm" opacity={0.95}
      zIndex={1000} cursor="pointer" title="Triple-tap to hard refresh"
      aria-label="Build version badge. Triple-tap to hard refresh."
    >
      {BUILD_VERSION || 'dev'}
    </Box>
  )
}

export default function MainAttendanceApp({ user, onLogout }) {
  const toast = useToast()
  const userKey = user?.id || 'anon'
  const today = new Date().toISOString().split('T')[0]

  // persisted UI
  const [screen, setScreen] = usePersistedState(`ui:screen:${userKey}`, 'home')
  const [projectId, setProjectId] = usePersistedState(`ui:project:${userKey}`, '')
  const [date, setDate] = usePersistedState(`ui:date:${userKey}`, today)

  // reference lists
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [types, setTypes] = useState({})
  const [refLoading, setRefLoading] = useState(false)
  const [refError, setRefError] = useState('')

  // view-attendance preview
  const [viewResults, setViewResults] = useState([])

  // display name
  const first = user?.user_metadata?.first_name?.trim?.() || ''
  const last  = user?.user_metadata?.last_name?.trim?.() || ''
  const displayName = [first, last].filter(Boolean).join(' ')
    || user?.user_metadata?.name
    || (user?.email?.split('@')[0] || 'there')

  // ---- Resilient reference loader (stale-while-revalidate) ----
  const mounted = useRef(true)
  const inFlight = useRef(false)
  const lastRefresh = useRef(0)
  const abortRef = useRef(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; try { abortRef.current?.abort() } catch {} }
  }, [])

  const setSafe = (setter) => (...args) => { if (mounted.current) setter(...args) }

  const fetchRefData = async (force = false) => {
    if (inFlight.current) return
    setRefError('')

    // Warm paint from cache if not forcing
    if (!force) {
      const cp = loadCache('projects', userKey)
      const ct = loadCache('teams', userKey)
      const cty = loadCache('types', userKey)
      if (cp?.length && projects.length === 0) setProjects(cp)
      if (ct?.length && teams.length === 0) setTeams(ct)
      if (cty && Object.keys(types).length === 0) setTypes(cty)
    }

    inFlight.current = true
    setRefLoading(true)

    const ac = new AbortController()
    abortRef.current = ac

    try {
      const [{ data: p }, { data: t }, { data: ty }] = await withRetry(
        () => Promise.all([
          supabase.from('projects').select('id,name').order('name', { ascending: true }),
          supabase.from('labour_teams').select('id,name').order('name', { ascending: true }),
          supabase.from('labour_types').select('id,team_id,type_name').order('team_id').order('type_name'),
        ]),
        { retries: 2, delay: 250 }
      )

      if (ac.signal.aborted) return

      const map = {}
      ;(ty || []).forEach(x => {
        map[x.team_id] = map[x.team_id] || []
        map[x.team_id].push(x)
      })

      setSafe(setProjects)(p || [])
      setSafe(setTeams)(t || [])
      setSafe(setTypes)(map)

      saveCache('projects', userKey, p || [])
      saveCache('teams', userKey, t || [])
      saveCache('types', userKey, map)
      lastRefresh.current = Date.now()
    } catch (e) {
      if (!ac.signal.aborted) setSafe(setRefError)(e?.message || 'Failed to load lists')
    } finally {
      if (!ac.signal.aborted) setSafe(setRefLoading)(false)
      inFlight.current = false
    }
  }

  // Initial + small delayed revalidate
  useEffect(() => {
    fetchRefData(false)
    const t = setTimeout(() => fetchRefData(true), 200)
    return () => clearTimeout(t)
  }, []) // mount once

  // Resume/online/focus revalidate (rate-limited)
  useEffect(() => {
    const maybeRefresh = () => {
      const age = Date.now() - lastRefresh.current
      const missing =
        projects.length === 0 || teams.length === 0 || Object.keys(types).length === 0
      if (missing || age > TTL_MS / 2) fetchRefData(true)
    }
    const onVis = () => { if (document.visibilityState === 'visible') maybeRefresh() }
    const onFocus = () => maybeRefresh()
    const onOnline = () => maybeRefresh()

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, teams.length, Object.keys(types).length])

  // ---- View Attendance helpers ----
  const fetchAttendance = async () => {
    if (!projectId || !date) {
      toast({ title: 'Select project & date', status: 'info', duration: 1500 })
      return
    }
    const { data, error } = await supabase
      .from('attendance')
      .select('count, labour_teams(name), labour_types(type_name)')
      .eq('project_id', projectId)
      .eq('date', date)
    if (error) {
      toast({ title: 'Fetch failed', description: error.message, status: 'error' })
      return
    }
    setViewResults(data || [])
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    const projectName = projects.find((p) => String(p.id) === String(projectId))?.name || 'N/A'
    doc.setFontSize(14)
    doc.text('Attendance Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Project: ${projectName}`, 14, 28)
    doc.text(`Date: ${date}`, 14, 34)
    const rowsData = viewResults.map((r) => [r.labour_teams.name, r.labour_types.type_name, r.count])
    doc.autoTable({ startY: 40, head: [['Team', 'Type', 'Count']], body: rowsData })
    doc.save(`Attendance-${projectName}-${date}.pdf`)
  }

  return (
    <Box bg="gray.50" minH="100vh" py={8} px={4} display="flex" alignItems="flex-start">
      <Box maxW="480px" w="100%" bg="white" mx="auto" p={{ base: 5, md: 6 }} borderRadius="2xl" shadow="md">
        {/* HOME */}
        {screen === 'home' && (
          <Stack spacing={5}>
            <Heading size="sm">👋 Welcome, {displayName}</Heading>

            <SectionCard title="Quick actions" subtitle="Choose what you’d like to do.">
              <Stack spacing={3}>
                <ActionButton icon="enter" variant="primary" onClick={() => setScreen('enter')}>
                  + Enter Attendance
                </ActionButton>
                <ActionButton icon="view" variant="outline" onClick={() => setScreen('view')}>
                  View Attendance
                </ActionButton>
                <ActionButton icon="work" variant="outline" onClick={() => setScreen('work')}>
                  Enter Work Report
                </ActionButton>
                <ActionButton icon="viewWork" variant="outline" onClick={() => setScreen('view-work')}>
                  View Work Reports
                </ActionButton>
              </Stack>

              <Button mt={6} size="sm" variant="outline" w="100%" onClick={onLogout}>
                Logout
              </Button>
            </SectionCard>
          </Stack>
        )}

        {/* VIEW */}
        {screen === 'view' && (
          <Stack spacing={4}>
            <Heading size="sm">View Attendance</Heading>

            <HStack align="center" gap={2}>
              <Select
                flex="1"
                placeholder={refLoading ? 'Loading projects…' : 'Select Project'}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                isDisabled={refLoading || (projects?.length || 0) === 0}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <Button
                size="sm"
                leftIcon={<Icon as={FiRefreshCcw} />}
                onClick={() => fetchRefData(true)}
                isLoading={refLoading}
                variant="ghost"
                aria-label="Reload lists"
              >
                Reload
              </Button>
            </HStack>

            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

            {!!refError && <Text color="red.500" fontSize="sm">{refError}</Text>}

            <Button colorScheme="blue" onClick={fetchAttendance}>
              View
            </Button>

            <Stack pt={2} spacing={2}>
              {viewResults.map((r, i) => (
                <Text key={i}>
                  {r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos
                </Text>
              ))}
            </Stack>

            {viewResults.length > 0 && (
              <Button colorScheme="green" onClick={downloadPDF}>
                Download as PDF
              </Button>
            )}

            <Button variant="outline" onClick={() => setScreen('home')}>← Back</Button>
          </Stack>
        )}

        {/* ENTER (moved to dedicated component) */}
        {screen === 'enter' && (
          <AttendanceEntry
            userKey={userKey}
            projects={projects}
            teams={teams}
            types={types}
            refLoading={refLoading}
            refError={refError}
            reloadRefData={() => fetchRefData(true)}
            projectId={projectId}
            setProjectId={setProjectId}
            date={date}
            setDate={setDate}
          />
        )}

        {/* WORK / VIEW-WORK */}
        {screen === 'work' && <WorkReport onBack={() => setScreen('home')} />}
        {screen === 'view-work' && <ViewWorkReports onBack={() => setScreen('home')} />}
      </Box>

      <BuildTag />
    </Box>
  )
}