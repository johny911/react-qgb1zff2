import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Select,
  Input,
  Heading,
  Text,
  Stack,
  Flex
} from '@chakra-ui/react'
import { supabase } from './supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ViewWorkReports({ onBack }) {
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [projects, setProjects] = useState([])
  const [rows, setRows] = useState([])

  // load projects
  useEffect(() => {
    supabase
      .from('projects')
      .select('id,name')
      .then(({ data }) => setProjects(data || []))
  }, [])

  const fetchReports = async () => {
    if (!projectId || !date) {
      return alert('Select project & date')
    }
    const { data, error } = await supabase
      .from('view_work_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date)
      .order('allotment_id', { ascending: true })
    if (error) return alert(error.message)
    setRows(data || [])
  }

  const generatePDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    const projectName = projects.find(p => p.id === parseInt(projectId))?.name || 'N/A'
    doc.text(`Work Done Report`, 14, 18)
    doc.setFontSize(12)
    doc.text(`Project: ${projectName}`, 14, 26)
    doc.text(`Date: ${date}`, 14, 32)

    const tableData = rows.map((r, i) => [
      i + 1,
      r.work_description,
      `${r.quantity} ${r.uom}`,
      r.team_name,
      r.labour_type_name,
      `${r.count} nos`
    ])

    autoTable(doc, {
      startY: 38,
      head: [['#', 'Work', 'Qty/UOM', 'Team', 'Type', 'Count']],
      body: tableData
    })

    doc.save(`work_done_${projectName}_${date}.pdf`)
  }

  return (
    <Box p={6} mx="auto" maxW="600px">
      <Flex mb={4} align="center" justify="space-between">
        <Heading size="md">👁️ View Work Done Report</Heading>
        <Button size="sm" variant="outline" onClick={onBack}>
          ← Back
        </Button>
      </Flex>

      <Stack spacing={3} mb={4}>
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

        <Button colorScheme="blue" onClick={fetchReports}>
          Load
        </Button>
      </Stack>

      {rows.length === 0 ? (
        <Text>No allocations found.</Text>
      ) : (
        <>
          <Button mb={4} colorScheme="green" onClick={generatePDF}>
            Download as PDF
          </Button>
          <Stack spacing={4}>
            {rows.map((r) => (
              <Box
                key={`${r.allotment_id}-${r.labour_id}`}
                p={4}
                borderWidth={1}
                borderRadius="md"
                bg="gray.50"
              >
                <Text fontWeight="bold">
                  {r.work_description}
                </Text>
                <Text>
                  — {r.quantity} {r.uom}
                </Text>
                <Text mt={2} pl={4}>
                  {r.team_name} / {r.labour_type_name}: {r.count} nos
                </Text>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </Box>
  )
}