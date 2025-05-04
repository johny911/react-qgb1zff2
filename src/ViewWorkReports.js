// src/ViewWorkReports.js
import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function ViewWorkReports({ onBack }) {
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [typesMap, setTypesMap] = useState({})
  const [selectedProject, setSelectedProject] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(false)

  // 1) Load projects, teams, and types on mount
  useEffect(() => {
    fetchProjects()
    fetchTeamsAndTypes()
  }, [])

  async function fetchProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
    if (!error) setProjects(data || [])
  }

  async function fetchTeamsAndTypes() {
    const [{ data: tData = [] }, { data: typeData = [] }] = await Promise.all([
      supabase.from('labour_teams').select('id, name'),
      supabase.from('labour_types').select('id, team_id, type_name'),
    ])

    setTeams(tData)
    // build a map: team_id → [types]
    const map = {}
    typeData.forEach((t) => {
      map[t.team_id] = map[t.team_id] || []
      map[t.team_id].push(t)
    })
    setTypesMap(map)
  }

  // 2) Fetch the report + its work entries + labours
  const fetchReports = async () => {
    if (!selectedProject || !date) {
      alert('Select project and date')
      return
    }
    setLoading(true)
    setWorks([])

    // a) latest report header
    const { data: headers = [], error: hdrErr } = await supabase
      .from('work_reports')
      .select('id')
      .eq('project_id', selectedProject)
      .eq('date', date)
      .order('id', { ascending: false })
      .limit(1)

    if (hdrErr || !headers.length) {
      setLoading(false)
      alert('No work report found.')
      return
    }
    const reportId = headers[0].id

    // b) all work allotments for that report
    const { data: workEntries = [], error: weErr } = await supabase
      .from('work_allotments')
      .select('id, work_description, quantity, uom')
      .eq('report_id', reportId)

    if (weErr) {
      console.error(weErr)
      setLoading(false)
      alert('Error loading works.')
      return
    }

    // c) all labours for those work IDs
    const workIds = workEntries.map((w) => w.id)
    const { data: labourRows = [], error: lbErr } = await supabase
      .from('work_report_labours')
      .select('work_allotment_id, team_id, labour_type_id, count')
      .in('work_allotment_id', workIds)

    if (lbErr) {
      console.error(lbErr)
      setLoading(false)
      alert('Error loading labours.')
      return
    }

    // d) group labours by work_allotment_id
    const labourMap = {}
    labourRows.forEach((l) => {
      labourMap[l.work_allotment_id] = labourMap[l.work_allotment_id] || []
      labourMap[l.work_allotment_id].push({
        ...l,
        teamName:
          teams.find((t) => t.id === l.team_id)?.name || 'Unknown Team',
        typeName:
          typesMap[l.team_id]?.find((tt) => tt.id === l.labour_type_id)
            ?.type_name || 'Unknown Type',
      })
    })

    // e) attach labours to each work entry
    const finalWorks = workEntries.map((w) => ({
      ...w,
      labours: labourMap[w.id] || [],
    }))

    setWorks(finalWorks)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: 20 }}>
      <h3>View Work Done Report</h3>
      <select
        style={input}
        value={selectedProject}
        onChange={(e) => setSelectedProject(e.target.value)}
      >
        <option value="">— Select Project —</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        style={input}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <button
        style={primaryBtn}
        onClick={fetchReports}
        disabled={loading}
      >
        {loading ? 'Loading…' : '🔍 View Report'}
      </button>

      {works.map((w, i) => (
        <div key={i} style={card}>
          <p>
            <strong>Work:</strong> {w.work_description}
          </p>
          <p>
            <strong>Qty:</strong> {w.quantity} {w.uom}
          </p>
          <p>
            <strong>Labours:</strong>
          </p>
          {w.labours.length > 0 ? (
            <ul>
              {w.labours.map((l, idx) => (
                <li key={idx}>
                  {l.teamName} – {l.typeName} – {l.count} nos
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666' }}>No labours assigned</p>
          )}
        </div>
      ))}

      <button style={secondaryBtn} onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

const input = {
  width: '100%',
  padding: 12,
  marginBottom: 12,
  fontSize: 16,
  borderRadius: 8,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
}
const primaryBtn = {
  background: '#3b6ef6',
  color: '#fff',
  padding: 14,
  border: 'none',
  borderRadius: 8,
  width: '100%',
  fontSize: 16,
  cursor: 'pointer',
  marginBottom: 12,
}
const secondaryBtn = {
  background: '#eee',
  color: '#333',
  padding: 12,
  border: 'none',
  borderRadius: 8,
  width: '100%',
  fontSize: 16,
  cursor: 'pointer',
  marginTop: 12,
}
const card = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 12,
  marginTop: 12,
}