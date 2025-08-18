// src/MainAttendanceApp.js
import React, { useEffect, useState } from 'react'
import { SectionCard, ActionButton } from './components/ui/Kit'
import {
  Box,
  Button,
  Select,
  Input,
  Heading,
  Text,
  Stack,
  Flex,
  Divider,
  Badge,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
} from '@chakra-ui/react'
import { supabase } from './supabaseClient'
import WorkReport from './WorkReport'
import ViewWorkReports from './ViewWorkReports'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import usePersistedState from './hooks/usePersistedState'
import { BUILD_VERSION } from './version' // commit message only

// Small build/version tag in bottom-right corner (message only)
function BuildTag() {
  const label = BUILD_VERSION || 'dev'
  return (
    <Box
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
      pointerEvents="none"
      zIndex={1000}
    >
      {label}
    </Box>
  )
}

export default function MainAttendanceApp({ user, onLogout }) {
  const toast = useToast()

  // ---- Persisted UI state (survives tab kills / PWA background) ----
  const userKey = user?.id || 'anon'
  const today = new Date().toISOString().split('T')[0]

  const [screen, setScreen] = usePersistedState(`ui:screen:${userKey}`, 'home')
  const [projectId, setProjectId] = usePersistedState(`ui:project:${userKey}`, '')
  const [date, setDate] = usePersistedState(`ui:date:${userKey}`, today)

  // rows key depends on selected project & date → separate draft per context
  const rowsKey = `att:rows:${userKey}:${projectId || 'no-project'}:${date || 'no-date'}`
  const [rows, setRows] = usePersistedState(rowsKey, [{ teamId: '', typeId: '', count: '' }])

  // ---- Server data / derived state ----
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [types, setTypes] = useState({})
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [editMode, setEditMode] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [viewResults, setViewResults] = useState([])

  useEffect(() => {
    ;(async () => {
      const { data: p } = await supabase.from('projects').select('id,name')
      const { data: t } = await supabase.from('labour_teams').select('id,name')
      const { data: ty } = await supabase
        .from('labour_types')
        .select('id,team_id,type_name')
      const map = {}
      ;(ty || []).forEach((x) => {
        map[x.team_id] = map[x.team_id] || []
        map[x.team_id].push(x)
      })
      setProjects(p || [])
      setTeams(t || [])
      setTypes(map)
    })()
  }, [])

  useEffect(() => {
    if (!projectId || !date) return
    ;(async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', projectId)
        .eq('date', date)

      if (data?.length > 0) {
        setAttendanceMarked(true)
        setEditMode(false)
        setRows(
          data.map((r) => ({
            teamId: String(r.team_id),
            typeId: String(r.labour_type_id),
            count: r.count.toString(),
          }))
        )
      } else {
        setAttendanceMarked(false)
        setEditMode(true)
        setRows([{ teamId: '', typeId: '', count: '' }])
      }
      setShowPreview(false)
    })()
  }, [projectId, date, setRows])

  // ---- Extra safety: flush state on background/unload ----
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(rowsKey, JSON.stringify(rows))
        localStorage.setItem(`ui:screen:${userKey}`, JSON.stringify(screen))
        localStorage.setItem(`ui:project:${userKey}`, JSON.stringify(projectId))
        localStorage.setItem(`ui:date:${userKey}`, JSON.stringify(date))
      } catch {}
    }
    const onVis = () => document.visibilityState === 'hidden' && save()
    const onUnload = () => save()

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onUnload)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onUnload)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [rowsKey, rows, screen, projectId, date, userKey])

  // ---- Helpers ----
  const totalCount = rows.reduce((sum, r) => sum + (parseInt(r.count || '0', 10) || 0), 0)

  const isRowValid = (r) =>
    r.teamId && r.typeId && r.count && !Number.isNaN(parseInt(r.count, 10)) && parseInt(r.count, 10) > 0

  const canSave = () =>
    projectId && date && rows.length > 0 && rows.every(isRowValid)

  // ---- Handlers ----
  const handleRowChange = (i, field, value) => {
    const copy = [...rows]
    copy[i][field] = value
    if (field === 'teamId') copy[i].typeId = ''
    setRows(copy)
  }

  const handleRowCount = (i, value) => {
    const val = value.replace(/[^\d]/g, '') // keep digits only
    handleRowChange(i, 'count', val)
  }

  const addRow = () => setRows([...rows, { teamId: '', typeId: '', count: '' }])

  const deleteRow = (i) => {
    const copy = [...rows]
    copy.splice(i, 1)
    setRows(copy.length ? copy : [{ teamId: '', typeId: '', count: '' }])
  }

  const handleSubmit = async () => {
    if (!canSave()) {
      toast({
        title: 'Please complete all fields.',
        description: 'Project, date, team, type, and a positive count are required.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      })
      return
    }

    await supabase.from('attendance').delete().eq('project_id', projectId).eq('date', date)
    const payload = rows.map((r) => ({
      project_id: projectId,
      date,
      team_id: r.teamId,
      labour_type_id: r.typeId,
      count: parseInt(r.count, 10),
    }))
    const { error } = await supabase.from('attendance').insert(payload)
    if (error) {
      toast({
        title: 'Save failed',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } else {
      toast({
        title: 'Attendance saved',
        description: `${totalCount} entries saved for ${date}.`,
        status: 'success',
        duration: 2000,
      })
      setAttendanceMarked(true)
      setEditMode(false)
      setShowPreview(false)
    }
  }

  const fetchAttendance = async () => {
    if (!projectId || !date) {
      toast({
        title: 'Select project & date',
        status: 'info',
        duration: 1500,
      })
      return
    }
    const { data } = await supabase
      .from('attendance')
      .select('count, labour_teams(name), labour_types(type_name)')
      .eq('project_id', projectId)
      .eq('date', date)
    setViewResults(data || [])
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    const projectName = projects.find((p) => p.id == projectId)?.name || 'N/A'
    doc.setFontSize(14)
    doc.text('Attendance Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Project: ${projectName}`, 14, 28)
    doc.text(`Date: ${date}`, 14, 34)
    const rowsData = viewResults.map((r) => [
      r.labour_teams.name,
      r.labour_types.type_name,
      r.count,
    ])
    doc.autoTable({
      startY: 40,
      head: [['Team', 'Type', 'Count']],
      body: rowsData,
    })
    doc.save(`Attendance-${projectName}-${date}.pdf`)
  }

  return (
    // Apple-like background, no top header bar
    <Box bg="gray.50" minH="100vh" py={8} px={4} display="flex" alignItems="flex-start">
      <Box
        maxW="480px"
        w="100%"
        bg="white"
        mx="auto"
        p={{ base: 5, md: 6 }}
        borderRadius="2xl"
        shadow="md"
      >
        {/* HOME */}
        {screen === 'home' && (
          <Stack spacing={5}>
            <Heading size="sm">👋 Welcome, {user.email.split('@')[0]}</Heading>

            <SectionCard
              title="Quick actions"
              subtitle="Choose what you’d like to do."
            >
              <Stack spacing={3}>
                <ActionButton
                  icon="enter"
                  variant="primary"
                  onClick={() => setScreen('enter')}
                >
                  + Enter Attendance
                </ActionButton>
                <ActionButton
                  icon="view"
                  variant="outline"
                  onClick={() => setScreen('view')}
                >
                  View Attendance
                </ActionButton>
                <ActionButton
                  icon="work"
                  variant="outline"
                  onClick={() => setScreen('work')}
                >
                  Enter Work Report
                </ActionButton>
                <ActionButton
                  icon="viewWork"
                  variant="outline"
                  onClick={() => setScreen('view-work')}
                >
                  View Work Reports
                </ActionButton>
              </Stack>

              <Button mt={6} size="sm" variant="outline" w="100%" onClick={onLogout}>
                Logout
              </Button>
            </SectionCard>
          </Stack>
        )}

        {/* VIEW (unchanged) */}
        {screen === 'view' && (
          <Stack spacing={4}>
            <Heading size="sm">View Attendance</Heading>
            <Select
              placeholder="Select Project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
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
            <Button variant="outline" onClick={() => setScreen('home')}>
              ← Back
            </Button>
          </Stack>
        )}

        {/* ENTER — redesigned */}
        {screen === 'enter' && (
          <Stack spacing={5}>
            <Flex align="center" justify="space-between">
              <Heading size="sm">Enter Attendance</Heading>
              {attendanceMarked && !editMode ? (
                <Badge colorScheme="green" variant="subtle">Saved</Badge>
              ) : (
                <Badge colorScheme="yellow" variant="subtle">Draft</Badge>
              )}
            </Flex>

            {/* Details card */}
            <SectionCard title="Details" subtitle="Select project and date.">
              <Stack spacing={3}>
                <Box>
                  <Text fontSize="sm" color="textMuted" mb={1}>Project</Text>
                  <Select
                    placeholder="Select Project"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    isDisabled={!editMode}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
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

                {attendanceMarked && !editMode && (
                  <Flex align="center" justify="space-between" pt={1}>
                    <Text color="green.600" fontSize="sm">✅ Attendance already marked</Text>
                    <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                      Edit
                    </Button>
                  </Flex>
                )}
              </Stack>
            </SectionCard>

            {/* Rows card */}
            <SectionCard
              title="Entries"
              subtitle="Add team, type and count for today."
            >
              <Stack spacing={3}>
                {rows.map((r, i) => (
                  <Box key={i} bg="gray.50" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                    <Stack spacing={2}>
                      <Box>
                        <Text fontSize="sm" color="textMuted" mb={1}>Team</Text>
                        <Select
                          placeholder="Select Team"
                          value={r.teamId}
                          onChange={(e) => handleRowChange(i, 'teamId', e.target.value)}
                          isDisabled={!editMode}
                        >
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </Select>
                      </Box>

                      <Box>
                        <Text fontSize="sm" color="textMuted" mb={1}>Type</Text>
                        <Select
                          placeholder={r.teamId ? 'Select Type' : 'Select team first'}
                          value={r.typeId}
                          onChange={(e) => handleRowChange(i, 'typeId', e.target.value)}
                          isDisabled={!editMode || !r.teamId}
                        >
                          {(types[r.teamId] || []).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.type_name}
                            </option>
                          ))}
                        </Select>
                      </Box>

                      <Box>
                        <Text fontSize="sm" color="textMuted" mb={1}>Count</Text>
                        <NumberInput
                          min={1}
                          value={r.count}
                          onChange={(_, val) => handleRowCount(i, String(val ?? ''))}
                          isDisabled={!editMode}
                        >
                          <NumberInputField placeholder="Enter count" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>

                      {!isRowValid(r) && (
                        <Text fontSize="xs" color="red.500">
                          Complete team, type and a positive count.
                        </Text>
                      )}

                      <Flex justify="flex-end">
                        <Button
                          size="xs"
                          colorScheme="red"
                          onClick={() => deleteRow(i)}
                          visibility={editMode ? 'visible' : 'hidden'}
                        >
                          Remove
                        </Button>
                      </Flex>
                    </Stack>
                  </Box>
                ))}

                {editMode && (
                  <Button onClick={addRow} variant="outline">
                    + Add Entry
                  </Button>
                )}
              </Stack>

              <Divider my={4} />

              <Stack spacing={1} mb={2}>
                <Heading size="xs">Summary</Heading>
                {rows.map((r, i) => {
                  const teamName = teams.find((t) => t.id == r.teamId)?.name || '—'
                  const typeName = (types[r.teamId] || []).find((x) => x.id == r.typeId)?.type_name || '—'
                  const count = r.count || '0'
                  return (
                    <Text key={i} fontSize="sm">
                      {teamName} – {typeName} – {count} nos
                    </Text>
                  )
                })}
              </Stack>

              {/* Sticky bottom action bar */}
              <Box
                position="sticky"
                bottom={-16}
                pt={3}
                mt={2}
                bg="white"
              >
                <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                  <Text color="textMuted" fontSize="sm">
                    Total: <b>{totalCount}</b> nos
                  </Text>
                  <Flex gap={2}>
                    <Button variant="outline" onClick={() => setScreen('home')}>
                      ← Back
                    </Button>
                    {editMode ? (
                      <Button colorScheme="brand" onClick={handleSubmit} isDisabled={!canSave()}>
                        ✅ Save Attendance
                      </Button>
                    ) : (
                      <Button onClick={() => setEditMode(true)}>
                        ✏️ Edit
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </Box>
            </SectionCard>
          </Stack>
        )}

        {/* WORK / VIEW-WORK (unchanged) */}
        {screen === 'work' && <WorkReport onBack={() => setScreen('home')} />}
        {screen === 'view-work' && (
          <ViewWorkReports onBack={() => setScreen('home')} />
        )}
      </Box>

      {/* Build/version tag */}
      <BuildTag />
    </Box>
  )
}