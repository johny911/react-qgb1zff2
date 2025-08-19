// src/attendance/AttendanceEntry.js
import React, { useEffect, useRef, useState } from 'react'
import {
  Box, Button, Select, Input, Heading, Text, Stack, Flex, Divider, Badge,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  useToast, HStack, Icon, Spinner
} from '@chakra-ui/react'
import { FiRefreshCcw } from 'react-icons/fi'
import { supabase } from '../supabaseClient'
import usePersistedState from '../hooks/usePersistedState'
import { SectionCard } from '../components/ui/Kit'

// small helpers
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function withRetry(fn, { retries = 1, delay = 200 } = {}) {
  let last
  for (let i = 0; i <= retries; i++) {
    try { return await fn() } catch (e) { last = e }
    await sleep(delay)
  }
  throw last
}

export default function AttendanceEntry({
  userKey,
  projects, teams, types,
  refLoading, refError, reloadRefData,
  projectId, setProjectId,
  date, setDate,
}) {
  const toast = useToast()

  // local (enter screen) state
  const rowsKey = `att:rows:${userKey}:${projectId || 'no-project'}:${date || 'no-date'}`
  const [rows, setRows] = usePersistedState(rowsKey, [{ teamId: '', typeId: '', count: '' }])
  const [attendanceExists, setAttendanceExists] = useState(false)
  const [editMode, setEditMode] = useState(true)
  const isEditing = attendanceExists

  // load existing attendance for (project, date)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    if (!projectId || !date) {
      setAttendanceExists(false)
      setEditMode(true)
      return
    }
    ;(async () => {
      const { data, error } = await withRetry(() =>
        supabase.from('attendance').select('*').eq('project_id', projectId).eq('date', date)
      )
      if (!mounted.current) return

      if (error) {
        setAttendanceExists(false)
        setEditMode(true)
        setRows([{ teamId: '', typeId: '', count: '' }])
        return
      }

      if ((data || []).length > 0) {
        setAttendanceExists(true)
        setEditMode(false)
        setRows(
          data.map((r) => ({
            teamId: String(r.team_id),
            typeId: String(r.labour_type_id),
            count: String(r.count ?? ''),
          }))
        )
      } else {
        setAttendanceExists(false)
        setEditMode(true)
        setRows([{ teamId: '', typeId: '', count: '' }])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, date])

  const isRowValid = (r) =>
    r.teamId && r.typeId && r.count && !Number.isNaN(parseInt(r.count, 10)) && parseInt(r.count, 10) > 0
  const canSave = () =>
    projectId && date && rows.length > 0 && rows.every(isRowValid)

  const handleRowChange = (i, field, value) => {
    const copy = [...rows]
    copy[i][field] = value
    if (field === 'teamId') copy[i].typeId = ''
    setRows(copy)
  }
  const handleRowCount = (i, value) => {
    const val = String(value ?? '').replace(/[^\d]/g, '')
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
        status: 'warning', duration: 2500, isClosable: true,
      })
      return
    }
    // Best-effort replace existing set atomically
    const del = await supabase.from('attendance').delete().eq('project_id', projectId).eq('date', date)
    if (del.error) {
      toast({ title: 'Save failed (delete)', description: del.error.message, status: 'error' })
      return
    }
    const payload = rows.map((r) => ({
      project_id: projectId,
      date,
      team_id: r.teamId,
      labour_type_id: r.typeId,
      count: parseInt(r.count, 10),
    }))
    const ins = await supabase.from('attendance').insert(payload)
    if (ins.error) {
      toast({ title: 'Save failed (insert)', description: ins.error.message, status: 'error' })
      return
    }
    toast({
      title: isEditing ? 'Attendance updated' : 'Attendance saved',
      status: 'success', duration: 1800,
    })
    setAttendanceExists(true)
    setEditMode(false)
  }

  return (
    <Stack spacing={5}>
      <Flex align="center" justify="space-between">
        <Heading size="sm">Enter Attendance</Heading>
        <Badge colorScheme={isEditing ? 'purple' : 'yellow'} variant="subtle">
          {isEditing ? 'Editing existing attendance' : 'Draft'}
        </Badge>
      </Flex>

      {/* Details card */}
      <SectionCard title="Details" subtitle="Select project and date.">
        <Stack spacing={3}>
          <Box>
            <Text fontSize="sm" color="textMuted" mb={1}>Project</Text>
            <HStack>
              <Select
                placeholder={refLoading ? 'Loading projects…' : 'Select Project'}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                isDisabled={!editMode || refLoading || (projects?.length || 0) === 0}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <Button
                size="sm"
                leftIcon={<Icon as={FiRefreshCcw} />}
                variant="ghost"
                onClick={reloadRefData}
                isLoading={refLoading}
              >
                Reload
              </Button>
            </HStack>
            {!!refError && <Text color="red.500" fontSize="xs" mt={1}>{refError}</Text>}
          </Box>

          <Box>
            <Text fontSize="sm" color="textMuted" mb={1}>Date</Text>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} isDisabled={!editMode} />
          </Box>

          {isEditing && !editMode && (
            <Flex align="center" justify="space-between" pt={1}>
              <Text color="green.600" fontSize="sm">✅ Attendance already exists for this date.</Text>
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
            </Flex>
          )}
        </Stack>
      </SectionCard>

      {/* Entries card */}
      <SectionCard title="Entries" subtitle="Add team, type and count for today.">
        <Stack spacing={3}>
          {rows.map((r, i) => (
            <Box key={i} bg="gray.50" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
              <Stack spacing={2}>
                <Box>
                  <Text fontSize="sm" color="textMuted" mb={1}>Team</Text>
                  <Select
                    placeholder={refLoading ? 'Loading teams…' : 'Select Team'}
                    value={r.teamId}
                    onChange={(e) => handleRowChange(i, 'teamId', e.target.value)}
                    isDisabled={!editMode || refLoading || (teams?.length || 0) === 0}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
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
                      <option key={t.id} value={t.id}>{t.type_name}</option>
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

                {!isRowValid(r) && editMode && (
                  <Text fontSize="xs" color="red.500">Complete team, type and a positive count.</Text>
                )}

                <Flex justify="flex-end">
                  <Button size="xs" colorScheme="red" onClick={() => deleteRow(i)} visibility={editMode ? 'visible' : 'hidden'}>
                    Remove
                  </Button>
                </Flex>
              </Stack>
            </Box>
          ))}

          {editMode && (
            <Button onClick={addRow} variant="outline">+ Add Entry</Button>
          )}
        </Stack>

        <Divider my={4} />

        <Stack spacing={1} mb={2}>
          <Heading size="xs">Summary</Heading>
          {rows.map((r, i) => {
            const teamName = teams.find((t) => String(t.id) === String(r.teamId))?.name || '—'
            const typeName = (types[r.teamId] || []).find((x) => String(x.id) === String(r.typeId))?.type_name || '—'
            const count = r.count || '0'
            return (
              <Text key={i} fontSize="sm">
                {teamName} – {typeName} – {count} nos
              </Text>
            )
          })}
        </Stack>

        <Box mt={4} width="100%">
          <Button colorScheme="brand" width="100%" size="lg" onClick={handleSubmit} isDisabled={!canSave() || !editMode}>
            {isEditing ? '💾 Update Attendance' : '✅ Save Attendance'}
          </Button>
          <Text fontSize="xs" color="gray.500" mt={2}>
            Tip: If lists look empty after switching apps, tap <Icon as={FiRefreshCcw} /> Reload above.
          </Text>
        </Box>
      </SectionCard>
    </Stack>
  )
}