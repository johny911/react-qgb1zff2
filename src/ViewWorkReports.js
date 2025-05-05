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
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function ViewWorkReports({ onBack }) {
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [projects, setProjects] = useState([])
  const [rows, setRows] = useState([])
  const [projectName, setProjectName] = useState('')

  // Load projects
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

    const selectedProject = projects.find(p => p.id == projectId)
    setProjectName(selectedProject?.name || '')

    const { data, error } = await supabase
      .from('view_work_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date)
      .order('allotment_id', { ascending: true })

    if (error) return alert(error.message)

    // Group by allotment_id
    const grouped = {}
    for (const row of data || []) {
      if (!grouped[row.allotment_id]) {
        grouped[row.allotment_id] = {
          id: row.allotment_id,
          work_description: row.work_description,
          quantity: row.quantity,
          uom: row.uom,
          labours: [],
        }
      }
      if (row.labour_id) {
        grouped[row.allotment_id].labours.push({
          team_name: row.team_name,
          labour_type_name: row.labour_type_name,
          count: row.count,
        })
      }
    }

    setRows(Object.values(grouped))
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Work Done Report', 14, 15)
    doc.setFontSize(11)
    doc.text(`Project: ${projectName}`, 14, 25)
    doc.text(`Date: ${date}`, 14, 32)

    let y = 40

    rows.forEach((r, idx) => {
      doc.setFont(undefined, 'bold')
      doc.text(`${idx + 1}. ${r.work_description} — ${r.quantity} ${r.uom}`, 14, y)
      y += 6
      doc.setFont(undefined, 'normal')

      const labourRows = r.labours.map(l => [
        l.team_name,
        l.labour_type_name,
        `${l.count} nos`,
      ])

      doc.autoTable({
        head: [['Team', 'Type', 'Count']],
        body: labourRows,
        startY: y,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [22, 160, 133] },
        margin: { left: 14 },
      })

      y = doc.lastAutoTable.finalY + 10
    })

    doc.save(`WorkReport-${projectName}-${date}.pdf`)
  }

  return (
    <Box p={6} mx="auto" maxW="600px">
      <Flex mb={4} align="center" justify="space-between">
        <Heading size="md">View Work Done Report</Heading>
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
          <Button colorScheme="green" mb={4} onClick={downloadPDF}>
            Download as PDF
          </Button>
          <Stack spacing={4}>
            {rows.map((r) => (
              <Box
                key={r.id}
                p={4}
                borderWidth={1}
                borderRadius="md"
                bg="gray.50"
              >
                <Text fontWeight="bold">{r.work_description}</Text>
                <Text>— {r.quantity} {r.uom}</Text>
                <Stack mt={2} pl={4} spacing={1}>
                  {r.labours.map((l, i) => (
                    <Text key={i}>
                      {l.team_name} / {l.labour_type_name}: {l.count} nos
                    </Text>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </Box>
  )
}