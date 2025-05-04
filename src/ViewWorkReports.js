// src/WorkReport.js
import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function WorkReport({ onBack }) {
  const [projects, setProjects] = useState([])
  const [teams, setTeams] = useState([])
  const [types, setTypes] = useState({})
  const [selectedProject, setSelectedProject] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  )
  const [works, setWorks] = useState([
    {
      description: '',
      quantity: '',
      uom: '',
      labourAllotments: [{ teamId: '', typeId: '', count: '' }],
    },
  ])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [remainingMap, setRemainingMap] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBaseData()
  }, [])

  useEffect(() => {
    if (selectedProject && date) {
      fetchAttendance()
    }
  }, [selectedProject, date])

  async function fetchBaseData() {
    const { data: projectsData } = await supabase.from('projects').select('*')
    const { data: teamsData } = await supabase
      .from('labour_teams')
      .select('*')
    const { data: typesData } = await supabase
      .from('labour_types')
      .select('*')

    const typeMap = {}
    typesData.forEach((t) => {
      if (!typeMap[t.team_id]) typeMap[t.team_id] = []
      typeMap[t.team_id].push(t)
    })

    setProjects(projectsData || [])
    setTeams(teamsData || [])
    setTypes(typeMap)
  }

  async function fetchAttendance() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', selectedProject)
      .eq('date', date)

    if (error) {
      console.error('fetchAttendance error:', error)
      return
    }
    const att = {}
    data.forEach((r) => {
      const key = `${r.team_id}-${r.labour_type_id}`
      att[key] = (att[key] || 0) + r.count
    })
    setAttendanceMap(att)
    setRemainingMap({ ...att })
  }

  function updateRemainingCounts() {
    const used = {}
    works.forEach((w) =>
      w.labourAllotments.forEach((a) => {
        const key = `${a.teamId}-${a.typeId}`
        used[key] = (used[key] || 0) + parseInt(a.count || '0')
      })
    )
    const rem = {}
    for (const key in attendanceMap) {
      rem[key] = attendanceMap[key] - (used[key] || 0)
    }
    setRemainingMap(rem)
  }

  const handleWorkChange = (wIdx, field, val) => {
    const copy = [...works]
    copy[wIdx][field] = val
    setWorks(copy)
  }

  const handleAllotmentChange = (wIdx, aIdx, field, val) => {
    const copy = [...works]
    const a = copy[wIdx].labourAllotments[aIdx]
    a[field] = val
    if (field === 'teamId') a.typeId = ''
    setWorks(copy)
    updateRemainingCounts()
  }

  const addWork = () =>
    setWorks([
      ...works,
      { description: '', quantity: '', uom: '', labourAllotments: [{ teamId: '', typeId: '', count: '' }] },
    ])

  const addAllotment = (wIdx) => {
    const copy = [...works]
    copy[wIdx].labourAllotments.push({ teamId: '', typeId: '', count: '' })
    setWorks(copy)
  }

  const canSubmit = () =>
    Object.values(remainingMap).every((v) => v === 0) &&
    selectedProject &&
    date &&
    works.every(
      (w) =>
        w.description &&
        w.quantity &&
        w.uom &&
        w.labourAllotments.every((a) => a.teamId && a.typeId && a.count)
    )

  const handleSubmit = async () => {
    if (!canSubmit()) {
      alert('Please fill all fields and allot all labours.')
      return
    }
    setLoading(true)

    // 1️⃣ Create report header
    const { data: rpt, error: rptErr } = await supabase
      .from('work_reports')
      .insert({ date, project_id: selectedProject })
      .select()
      .single()
    console.log('💡 report insert:', { rpt, rptErr })
    if (rptErr || !rpt) {
      alert('Error creating report header.')
      setLoading(false)
      return
    }

    // 2️⃣ For each work: insert allotment row, then labours
    for (const w of works) {
      const { data: wa, error: waErr } = await supabase
        .from('work_allotments')
        .insert({
          report_id: rpt.id,
          work_description: w.description,
          quantity: w.quantity,
          uom: w.uom,
        })
        .select()
        .single()
      console.log('💡 work_allotment insert:', { wa, waErr })
      if (waErr || !wa) {
        alert('Error inserting work description: ' + waErr?.message)
        continue
      }

      const rows = w.labourAllotments.map((a) => ({
        report_id: rpt.id,
        work_allotment_id: wa.id,
        team_id: a.teamId,
        labour_type_id: a.typeId,
        count: parseInt(a.count),
      }))
      const { data: lr, error: lrErr } = await supabase
        .from('work_report_labours')
        .insert(rows)
        .select()
      console.log('💡 labour insert:', { lr, lrErr })
      if (lrErr) {
        alert('Error assigning labours: ' + lrErr.message)
      }
    }

    alert('✅ Work report submitted!')
    setLoading(false)
    onBack()
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: 20 }}>
      <h3>Work Done Report</h3>
      <select style={input} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
        <option value="">-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />

      {works.map((w, wi) => (
        <div key={wi} style={{ border: '1px solid #ccc', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <input
            placeholder="Work Description"
            style={input}
            value={w.description}
            onChange={(e) => handleWorkChange(wi, 'description', e.target.value)}
          />
          <input
            placeholder="Quantity"
            style={input}
            value={w.quantity}
            onChange={(e) => handleWorkChange(wi, 'quantity', e.target.value)}
          />
          <input
            placeholder="UOM"
            style={input}
            value={w.uom}
            onChange={(e) => handleWorkChange(wi, 'uom', e.target.value)}
          />
          <p><strong>Allotted Labours</strong></p>
          {w.labourAllotments.map((a, ai) => (
            <div key={ai} style={{ marginBottom: 8 }}>
              <select
                style={input}
                value={a.teamId}
                onChange={(e) => handleAllotmentChange(wi, ai, 'teamId', e.target.value)}
              >
                <option value="">Select Team</option>
                {teams.filter((t) =>
                  Object.keys(attendanceMap).some((k) => k.startsWith(`${t.id}-`))
                ).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select
                style={input}
                value={a.typeId}
                onChange={(e) => handleAllotmentChange(wi, ai, 'typeId', e.target.value)}
              >
                <option value="">Select Type</option>
                {(types[a.teamId] || []).filter((tt) =>
                  attendanceMap[`${a.teamId}-${tt.id}`] > 0
                ).map((tt) => (
                  <option key={tt.id} value={tt.id}>{tt.type_name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Count"
                style={input}
                value={a.count}
                onChange={(e) => handleAllotmentChange(wi, ai, 'count', e.target.value)}
              />
              {a.teamId && a.typeId && (
                <p style={{ color: 'red' }}>
                  Remaining: {remainingMap[`${a.teamId}-${a.typeId}`] || 0} nos
                </p>
              )}
            </div>
          ))}
          <button style={secondaryBtn} onClick={() => addAllotment(wi)}>+ Add Labour</button>
        </div>
      ))}

      <button style={secondaryBtn} onClick={addWork}>+ Add Work</button>
      <button style={primaryBtn} onClick={handleSubmit} disabled={loading || !canSubmit()}>
        {loading ? 'Submitting…' : '✅ Submit Work Report'}
      </button>
      <button style={secondaryBtn} onClick={onBack}>← Back</button>
    </div>
  )
}

const input = {
  width: '100%',
  padding: 12,
  marginBottom: 12,
  fontSize: 16,
  borderRadius: 10,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
}
const primaryBtn = {
  background: '#3b6ef6',
  color: '#fff',
  padding: 14,
  borderRadius: 10,
  border: 'none',
  width: '100%',
  fontSize: 16,
  marginBottom: 12,
  cursor: 'pointer',
}
const secondaryBtn = {
  background: '#eee',
  color: '#333',
  padding: 12,
  borderRadius: 10,
  border: 'none',
  width: '100%',
  fontSize: 16,
  marginBottom: 12,
  cursor: 'pointer',
}