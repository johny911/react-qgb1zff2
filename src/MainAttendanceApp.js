// src/MainAttendanceApp.js
import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Select,
  Input,
  Heading,
  Text,
  Stack,
  Flex,
} from '@chakra-ui/react'
import { supabase } from './supabaseClient'
import WorkReport from './WorkReport'
import ViewWorkReports from './ViewWorkReports'

export default function MainAttendanceApp({ user, onLogout }) {
  const [screen, setScreen] = useState('home')
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [types, setTypes] = useState({})
  const [rows, setRows] = useState([{ teamId: '', typeId: '', count: '' }])
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [editMode, setEditMode] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [viewResults, setViewResults] = useState([])

  // Load dropdown data
  useEffect(() => {
    ;(async () => {
      const { data: p } = await supabase
        .from('projects')
        .select('id,name')
      const { data: t } = await supabase
        .from('labour_teams')
        .select('id,name')
      const { data: ty } = await supabase
        .from('labour_types')
        .select('id,team_id,type_name')
      const map = {}
      ty.forEach((x) => {
        map[x.team_id] = map[x.team_id] || []
        map[x.team_id].push(x)
      })
      setProjects(p || [])
      setTeams(t || [])
      setTypes(map)
    })()
  }, [])

  // Check if attendance exists whenever project or date changes
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
  }, [projectId, date])

  // Handlers for attendance form
  const handleRowChange = (i, f, v) => {
    const c = [...rows]
    c[i][f] = v
    if (f === 'teamId') c[i].typeId = ''
    setRows(c)
  }
  const addRow = () =>
    setRows([...rows, { teamId: '', typeId: '', count: '' }])
  const deleteRow = (i) => {
    const c = [...rows]
    c.splice(i, 1)
    setRows(c.length ? c : [{ teamId: '', typeId: '', count: '' }])
  }
  const handleSubmit = async () => {
    if (
      !projectId ||
      !date ||
      rows.some((r) => !r.teamId || !r.typeId || !r.count)
    ) {
      return alert('Please fill all fields')
    }
    // delete old
    await supabase
      .from('attendance')
      .delete()
      .eq('project_id', projectId)
      .eq('date', date)
    // insert new
    const payload = rows.map((r) => ({
      project_id: projectId,
      date,
      team_id: r.teamId,
      labour_type_id: r.typeId,
      count: parseInt(r.count, 10),
    }))
    const { error } = await supabase.from('attendance').insert(payload)
    if (error) alert('Error: ' + error.message)
    else {
      alert('✅ Attendance saved!')
      setAttendanceMarked(true)
      setEditMode(false)
      setShowPreview(false)
    }
  }

  // View attendance
  const fetchAttendance = async () => {
    if (!projectId || !date) return alert('Select project & date')
    const { data } = await supabase
      .from('attendance')
      .select('count, labour_teams(name), labour_types(type_name)')
      .eq('project_id', projectId)
      .eq('date', date)
    setViewResults(data || [])
  }

  return (
    <Box bg="gray.50" minH="100vh" py={8}>
      <Box
        maxW="460px"
        bg="white"
        mx="auto"
        p={6}
        borderRadius="lg"
        shadow="md"
      >
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="md">🏗️ SiteTrack</Heading>
          <Button size="sm" variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </Flex>

        {/* Home */}
        {screen === 'home' && (
          <Stack spacing={4}>
            <Text fontSize="lg">Welcome, {user.email.split('@')[0]}</Text>
            <Button colorScheme="blue" onClick={() => setScreen('enter')}>
              ➕ Enter Attendance
            </Button>
            <Button onClick={() => setScreen('view')}>
              👁️ View Attendance
            </Button>
            <Button onClick={() => setScreen('work')}>
              📝 Work Done Report
            </Button>
            <Button onClick={() => setScreen('view-work')}>
              👁️ View Work Done Report
            </Button>
          </Stack>
        )}

        {/* View Attendance */}
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
                  {r.labour_teams.name} – {r.labour_types.type_name} –{' '}
                  {r.count} nos
                </Text>
              ))}
            </Stack>
            <Button variant="outline" onClick={() => setScreen('home')}>
              ← Back
            </Button>
          </Stack>
        )}

        {/* Enter / Edit Attendance */}
        {screen === 'enter' && (
          <Stack spacing={4}>
            <Heading size="sm">Enter Attendance</Heading>
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
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              isDisabled={!editMode}
            />
            {attendanceMarked && !editMode && (
              <Flex align="center">
                <Text color="green.500">✅ Attendance already marked</Text>
                <Button
                  size="sm"
                  ml={4}
                  onClick={() => setEditMode(true)}
                >
                  ✏️ Edit
                </Button>
              </Flex>
            )}

            {rows.map((r, i) => (
              <Box key={i} position="relative" bg="gray.100" p={4} borderRadius="md">
                <Button
                  size="xs"
                  position="absolute"
                  top={2}
                  right={2}
                  colorScheme="red"
                  onClick={() => deleteRow(i)}
                  visibility={editMode ? 'visible' : 'hidden'}
                >
                  ×
                </Button>
                <Select
                  placeholder="Team"
                  mb={2}
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
                <Select
                  placeholder="Type"
                  mb={2}
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
                <Input
                  placeholder="No. of Batches"
                  type="number"
                  value={r.count}
                  onChange={(e) => handleRowChange(i, 'count', e.target.value)}
                  isDisabled={!editMode}
                />
              </Box>
            ))}

            {editMode && (
              <>
                <Button colorScheme="blue" onClick={addRow}>
                  + Add Team
                </Button>
                <Button onClick={() => setShowPreview(true)}>
                  👁️ Preview Summary
                </Button>
                {showPreview && (
                  <Box pt={4}>
                    <Heading size="xs" mb={2}>
                      Summary
                    </Heading>
                    <Stack spacing={1} mb={4}>
                      {rows.map((r, i) => {
                        const name =
                          teams.find((t) => t.id == r.teamId)?.name || 'Team'
                        const typeName =
                          types[r.teamId]?.find((x) => x.id == r.typeId)
                            ?.type_name || 'Type'
                        return (
                          <Text key={i}>
                            {name} – {typeName} – {r.count} nos
                          </Text>
                        )
                      })}
                    </Stack>
                    <Button colorScheme="green" onClick={handleSubmit}>
                      ✅ Save Attendance
                    </Button>
                  </Box>
                )}
              </>
            )}

            <Button variant="outline" onClick={() => setScreen('home')}>
              ← Back
            </Button>
          </Stack>
        )}

        {/* Work Done Report */}
        {screen === 'work' && <WorkReport onBack={() => setScreen('home')} />}

        {/* View Work Reports */}
        {screen === 'view-work' && (
          <ViewWorkReports onBack={() => setScreen('home')} />
        )}
      </Box>
    </Box>
  )
}