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

  // 1️⃣ Load projects, teams & types
  useEffect(() => {
    ;(async () => {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id,name')
      const { data: teamsData } = await supabase
        .from('labour_teams')
        .select('id,name')
      const { data: typesData } = await supabase
        .from('labour_types')
        .select('id,team_id,type_name')

      const typeMap = {}
      typesData.forEach((t) => {
        if (!typeMap[t.team_id]) typeMap[t.team_id] = []
        typeMap[t.team_id].push(t)
      })

      setProjects(projectsData || [])
      setTeams(teamsData || [])
      setTypes(typeMap)
    })()
  }, [])

  // 2️⃣ Fetch attendance when project/date changes
  useEffect(() => {
    if (!selectedProject || !date) {
      setAttendanceMap({})
      setRemainingMap({})
      return
    }
    ;(async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('date', date)
      if (data) {
        const att = {}
        data.forEach((r) => {
          const key = `${r.team_id}-${r.labour_type_id}`
          att[key] = (att[key] || 0) + r.count
        })
        setAttendanceMap(att)
        setRemainingMap({ ...att })
      }
    })()
  }, [selectedProject, date])

  // 3️⃣ Helpers to recalc remaining
  const updateRemainingCounts = () => {
    const used = {}
    works.forEach((w) =>
      w.labourAllotments.forEach((a) => {
        const key = `${a.teamId}-${a.typeId}`
        used[key] = (used[key] || 0) + parseInt(a.count || '0', 10)
      })
    )
    const rem = {}
    Object.keys(attendanceMap).forEach((key) => {
      rem[key] = attendanceMap[key] - (used[key] || 0)
    })
    setRemainingMap(rem)
  }

  // 4️⃣ Add/remove works & allotments
  const addWork = () =>
    setWorks([
      ...works,
      { description: '', quantity: '', uom: '', labourAllotments: [{ teamId: '', typeId: '', count: '' }] },
    ])
  const addAllotment = (wIdx) => {
    const c = [...works]
    c[wIdx].labourAllotments.push({ teamId: '', typeId: '', count: '' })
    setWorks(c)
  }

  // 5️⃣ Update handlers
  const updateWork = (wIdx, field, val) => {
    const c = [...works]
    c[wIdx][field] = val
    setWorks(c)
  }
  const updateAllot = (wIdx, aIdx, field, val) => {
    const c = [...works]
    c[wIdx].labourAllotments[aIdx][field] = val
    if (field === 'teamId') c[wIdx].labourAllotments[aIdx].typeId = ''
    setWorks(c)
    updateRemainingCounts()
  }

  // 6️⃣ Submit into normalized tables
  const handleSubmit = async () => {
    if (!selectedProject || !date) {
      return alert('Select project & date')
    }
    // basic validation
    for (let w of works) {
      if (!w.description || !w.quantity || !w.uom) {
        return alert('Fill all work fields')
      }
      for (let a of w.labourAllotments) {
        if (!a.teamId || !a.typeId || !a.count) {
          return alert('Fill all labour fields')
        }
      }
    }

    // insert report
    const { data: report, error: rErr } = await supabase
      .from('work_reports')
      .insert({
        project_id: selectedProject,
        date,
        description: `Report for ${date}`,
      })
      .select()
      .single()
    if (rErr) return alert(rErr.message)

    // insert each work item & its labours
    for (let w of works) {
      const { data: wa, error: waErr } = await supabase
        .from('work_allotments')
        .insert({
          report_id: report.id,
          work_description: w.description,
          quantity: w.quantity,
          uom: w.uom,
        })
        .select()
        .single()
      if (waErr) {
        console.error('Work insert error:', waErr)
        continue
      }

      const labourRows = w.labourAllotments.map((a) => ({
        work_allotment_id: wa.id,
        team_id: a.teamId,
        labour_type_id: a.typeId,
        count: parseInt(a.count, 10),
      }))
      const { error: lErr } = await supabase
        .from('work_report_labours')
        .insert(labourRows)
      if (lErr) console.error('Labour insert error:', lErr)
    }

    alert('✅ Work report submitted!')
    onBack()
  }

  return (
    <div style={{ padding: 20 }}>
      <h3>📝 Work Done Report</h3>

      {/* Project & Date */}
      <select
        style={input}
        value={selectedProject}
        onChange={(e) => setSelectedProject(e.target.value)}
      >
        <option value=''>-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        type='date'
        style={input}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {works.map((w, wIdx) => (
        <div key={wIdx} style={card}>
          {/* Work fields */}
          <input
            placeholder='Work Description'
            style={input}
            value={w.description}
            onChange={(e) => updateWork(wIdx, 'description', e.target.value)}
          />
          <input
            placeholder='Quantity'
            style={input}
            value={w.quantity}
            onChange={(e) => updateWork(wIdx, 'quantity', e.target.value)}
          />
          <input
            placeholder='UOM'
            style={input}
            value={w.uom}
            onChange={(e) => updateWork(wIdx, 'uom', e.target.value)}
          />

          <p>
            <strong>Allotted Labours</strong>
          </p>

          {w.labourAllotments.map((a, aIdx) => {
            // only teams/types with attendance
            const filteredTeams = teams.filter((t) =>
              Object.keys(attendanceMap).some((k) => k.startsWith(`${t.id}-`))
            )
            const filteredTypes =
              (types[a.teamId] || []).filter(
                (t) => attendanceMap[`${a.teamId}-${t.id}`] > 0
              ) || []

            return (
              <div key={aIdx} style={{ marginBottom: 8 }}>
                <select
                  style={input}
                  value={a.teamId}
                  onChange={(e) =>
                    updateAllot(wIdx, aIdx, 'teamId', e.target.value)
                  }
                >
                  <option value=''>Select Team</option>
                  {filteredTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  style={input}
                  value={a.typeId}
                  onChange={(e) =>
                    updateAllot(wIdx, aIdx, 'typeId', e.target.value)
                  }
                  disabled={!a.teamId}
                >
                  <option value=''>Select Type</option>
                  {filteredTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.type_name}
                    </option>
                  ))}
                </select>

                <input
                  type='number'
                  placeholder='Count'
                  style={input}
                  value={a.count}
                  onChange={(e) =>
                    updateAllot(wIdx, aIdx, 'count', e.target.value)
                  }
                />

                {/* Remaining for this team-type */}
                {a.teamId && a.typeId && (
                  <p style={{ color: 'red' }}>
                    Remaining:{' '}
                    {remainingMap[`${a.teamId}-${a.typeId}`] || 0} nos
                  </p>
                )}
              </div>
            )
          })}

          <button
            style={secondaryBtn}
            onClick={() => addAllotment(wIdx)}
          >
            + Add Labour
          </button>
        </div>
      ))}

      <button style={secondaryBtn} onClick={addWork}>
        + Add Work
      </button>
      <button style={primaryBtn} onClick={handleSubmit}>
        ✅ Submit Work Report
      </button>
      <button style={secondaryBtn} onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

const input = {
  width: '100%',
  padding: 8,
  marginBottom: 8,
  borderRadius: 6,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
}
const primaryBtn = {
  ...input,
  background: '#3b6ef6',
  color: '#fff',
  cursor: 'pointer',
}
const secondaryBtn = {
  ...input,
  background: '#eee',
  cursor: 'pointer',
}
const card = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
}