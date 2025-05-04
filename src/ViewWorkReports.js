// src/ViewWorkReports.js
import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function ViewWorkReports({ onBack }) {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(false)

  // 1) load projects on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
      if (!error) setProjects(data || [])
    })()
  }, [])

  // 2) fetch report + related work & labour rows
  const fetchReports = async () => {
    if (!selectedProject || !date) {
      alert('Please select a project and date')
      return
    }
    setLoading(true)
    setWorks([])

    // a) get latest report header for this project+date
    const { data: headers, error: hdrErr } = await supabase
      .from('work_reports')
      .select('id')
      .eq('project_id', selectedProject)
      .eq('date', date)
      .order('id', { ascending: false })
      .limit(1)

    if (hdrErr || !headers?.length) {
      setLoading(false)
      alert('No work report found for that date/project')
      return
    }
    const reportId = headers[0].id

    // b) get all work_allotments for that report
    const { data: workAllotments, error: waErr } = await supabase
      .from('work_allotments')
      .select('id, work_description, quantity, uom')
      .eq('report_id', reportId)

    if (waErr) {
      console.error('work_allotments error', waErr)
      alert('Error loading work entries')
      setLoading(false)
      return
    }

    // c) get all labour lines for that report
    const { data: labourRows, error: lbErr } = await supabase
      .from('work_report_labours')
      .select('work_allotment_id, count, labour_teams(name), labour_types(type_name)')
      .eq('report_id', reportId)

    if (lbErr) {
      console.error('labourRows error', lbErr)
      alert('Error loading labour entries')
      setLoading(false)
      return
    }

    // d) group labours by work_allotment_id
    const labourMap = {}
    (labourRows || []).forEach((l) => {
      const key = l.work_allotment_id
      if (!labourMap[key]) labourMap[key] = []
      labourMap[key].push(l)
    })

    // e) merge into final works array
    const finalWorks = (workAllotments || []).map((w) => ({
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
                  {l.labour_teams.name} – {l.labour_types.type_name} –{' '}
                  {l.count} nos
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
  padding: '12px 0',
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
  padding: '12px 0',
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