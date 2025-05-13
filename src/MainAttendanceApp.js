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
  useColorMode,
  IconButton,
} from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'
import { supabase } from './supabaseClient'
import WorkReport from './WorkReport'
import ViewWorkReports from './ViewWorkReports'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function MainAttendanceApp({ user, onLogout }) {
  const { colorMode, toggleColorMode } = useColorMode()

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
      const { data: p } = await supabase.from('projects').select('id,name')
      const { data: t } = await supabase.from('labour_teams').select('id,name')
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

  // Check existing attendance
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

  // Attendance form handlers
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
    await supabase
      .from('attendance')
      .delete()
      .eq('project_id', projectId)
      .eq('date', date)
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

  // Fetch attendance for viewing
  const fetchAttendance = async () => {
    if (!projectId || !date) return alert('Select project & date')
    const { data } = await supabase
      .from('attendance')
      .select('count, labour_teams(name), labour_types(type_name)')
      .eq('project_id', projectId)
      .eq('date', date)
    setViewResults(data || [])
  }

  // Generate PDF
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
    <Box bg="gray.50" minH="100vh" py={8} px={4}>
      <Box
        maxW="460px"
        bg="white"
        mx="auto"
        p={6}
        borderRadius="lg"
        shadow="md"
      >
        {/* Header with theme toggle */}
        <Flex justify="space-between" align="center" mb={6} wrap="wrap">
          <Heading size="md">SiteTrack</Heading>
          <Flex>
            <IconButton
              aria-label="Toggle dark mode"
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              size="sm"
              variant="ghost"
              mr={2}
            />
            <Button size="sm" variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </Flex>
        </Flex>

        {/* Home */}
        {screen === 'home' && (
          <Stack spacing={4}>
            <Text fontSize="lg">Welcome, {user.email.split('@')[0]}</Text>
            <Button colorScheme="blue" onClick={() => setScreen('enter')}>
              + Enter Attendance
            </Button>
            <Button onClick={() => setScreen('view')}>View Attendance</Button>
            <Button onClick={() => setScreen('work')}>Work Done Report</Button>
            <Button onClick={() => setScreen('view-work')}>
              View Work Done Report
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

        {/* Enter / Edit Attendance */}
        {screen === 'enter' && (
          <Stack spacing={4}>
            <Heading size="sm">Enter Attendance</Heading>
            {/* …existing enter/edit UI… */}
            {/* (unchanged except for header above) */}
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