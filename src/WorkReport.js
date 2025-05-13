// src/WorkReport.js
import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Input,
  Select,
  Heading,
  Text,
  Stack,
  Flex,
} from '@chakra-ui/react'
import { supabase } from './supabaseClient'

export default function WorkReport({ onBack }) {
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [types, setTypes] = useState({})
  const [selectedProject, setSelectedProject] = useState('')
  const [date, setDate] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [attendanceMap, setAttendanceMap] = useState({})
  const [remainingMap, setRemainingMap] = useState({})
  const [works, setWorks] = useState([
    {
      description: '',
      quantity: '',
      uom: '',
      labourAllotments: [{ teamId: '', typeId: '', count: '' }],
    },
  ])

  // Load dropdowns
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

  // Fetch attendance
  useEffect(() => {
    if (!selectedProject || !date) {
      setAttendanceMap({})
      setRemainingMap({})
      return
    }
    ;(async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('date', date)
      const att = {}
      data.forEach((r) => {
        const key = `${r.team_id}-${r.labour_type_id}`
        att[key] = (att[key] || 0) + r.count
      })
      setAttendanceMap(att)
      setRemainingMap({ ...att })
    })()
  }, [selectedProject, date])

  // Recalculate remaining
  const updateRemaining = () => {
    const used = {}
    works.forEach((w) =>
      w.labourAllotments.forEach((a) => {
        const key = `${a.teamId}-${a.typeId}`
        used[key] = (used[key] || 0) + parseInt(a.count || '0', 10)
      })
    )
    const rem = {}
    Object.keys(attendanceMap).forEach((k) => {
      rem[k] = attendanceMap[k] - (used[k] || 0)
    })
    setRemainingMap(rem)
  }

  // Add work & labour
  const addWork = () =>
    setWorks([
      ...works,
      {
        description: '',
        quantity: '',
        uom: '',
        labourAllotments: [{ teamId: '', typeId: '', count: '' }],
      },
    ])
  const addLabour = (wIdx) => {
    const c = [...works]
    c[wIdx].labourAllotments.push({ teamId: '', typeId: '', count: '' })
    setWorks(c)
  }

  // Update handlers
  const updateWork = (wIdx, f, v) => {
    const c = [...works]
    c[wIdx][f] = v
    setWorks(c)
  }
  const updateAllot = (wIdx, aIdx, f, v) => {
    const c = [...works]
    c[wIdx].labourAllotments[aIdx][f] = v
    if (f === 'teamId') c[wIdx].labourAllotments[aIdx].typeId = ''
    setWorks(c)
    updateRemaining()
  }

  const canSubmit = () =>
    Object.values(remainingMap).every((v) => v === 0)

  // Submit
  const handleSubmit = async () => {
    if (!selectedProject || !date)
      return alert('Select project & date')
    // validate
    for (let w of works) {
      if (!w.description || !w.quantity || !w.uom)
        return alert('Fill all work fields')
      for (let a of w.labourAllotments)
        if (!a.teamId || !a.typeId || !a.count)
          return alert('Fill all labour fields')
    }
    // insert report
    const { data: rp, error: re } = await supabase
      .from('work_reports')
      .insert({
        project_id: selectedProject,
        date,
        description: `Report ${date}`,
      })
      .select()
      .single()
    if (re) return alert(re.message)
    // each work + labours
    for (let w of works) {
      const { data: wa, error: we } = await supabase
        .from('work_allotments')
        .insert({
          report_id: rp.id,
          work_description: w.description,
          quantity: w.quantity,
          uom: w.uom,
        })
        .select()
        .single()
      if (we) continue
      const rows = w.labourAllotments.map((a) => ({
        work_allotment_id: wa.id,
        team_id: a.teamId,
        labour_type_id: a.typeId,
        count: parseInt(a.count, 10),
      }))
      await supabase.from('work_report_labours').insert(rows)
    }
    alert('✅ Work report submitted!')
    onBack()
  }

  return (
    <Box p={6}>
      <Stack spacing={4}>
        <Flex justify="space-between" align="center">
          <Heading size="md">📝 Work Done Report</Heading>
          <Button size="sm" variant="outline" onClick={onBack}>
            ← Back
          </Button>
        </Flex>

        <Select
          placeholder="Select Project"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
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

        {works.map((w, wIdx) => (
          <Box
            key={wIdx}
            borderWidth={1}
            borderRadius="md"
            p={4}
            mb={4}
          >
            <Input
              placeholder="Work Description"
              mb={2}
              value={w.description}
              onChange={(e) =>
                updateWork(wIdx, 'description', e.target.value)
              }
            />
            <Input
              placeholder="Quantity"
              mb={2}
              value={w.quantity}
              onChange={(e) =>
                updateWork(wIdx, 'quantity', e.target.value)
              }
            />
            <Input
              placeholder="UOM"
              mb={2}
              value={w.uom}
              onChange={(e) =>
                updateWork(wIdx, 'uom', e.target.value)
              }
            />

            <Text fontWeight="bold" mb={2}>
              Allotted Labours
            </Text>
            {w.labourAllotments.map((a, aIdx) => {
              const filteredTeams = teams.filter((t) =>
                Object.keys(attendanceMap).some((key) =>
                  key.startsWith(`${t.id}-`)
                )
              )
              const filteredTypes =
                (types[a.teamId] || []).filter(
                  (t) => attendanceMap[`${a.teamId}-${t.id}`] > 0
                ) || []

              return (
                <Stack key={aIdx} spacing={2} mb={2}>
                  <Select
                    placeholder="Team"
                    value={a.teamId}
                    onChange={(e) =>
                      updateAllot(wIdx, aIdx, 'teamId', e.target.value)
                    }
                  >
                    {filteredTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    placeholder="Type"
                    value={a.typeId}
                    onChange={(e) =>
                      updateAllot(wIdx, aIdx, 'typeId', e.target.value)
                    }
                    isDisabled={!a.teamId}
                  >
                    {filteredTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.type_name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    placeholder="Count"
                    value={a.count}
                    onChange={(e) =>
                      updateAllot(wIdx, aIdx, 'count', e.target.value)
                    }
                  />
                  {a.teamId && a.typeId && (
                    <Text color="red.500">
                      Remaining:{' '}
                      {remainingMap[`${a.teamId}-${a.typeId}`] || 0} nos
                    </Text>
                  )}
                </Stack>
              )
            })}

            {/* wrapped +Add Labour in its own Box to avoid overlap */}
            <Box textAlign="right" mt={2}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addLabour(wIdx)}
              >
                + Add Labour
              </Button>
            </Box>
          </Box>
        ))}

        <Stack direction="row" spacing={2}>
          <Button onClick={addWork}>+ Add Work</Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isDisabled={!canSubmit()}
          >
            ✅ Submit Work Report
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}