// src/MainAttendanceApp.js
import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

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
  const [loading, setLoading] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [viewResults, setViewResults] = useState([])
  const [editMode, setEditMode] = useState(true)

  // Fetch base data once
  useEffect(() => {
    fetchBaseData()
  }, [])

  // Whenever project/date changes, check attendance
  useEffect(() => {
    if (projectId && date) checkAttendanceMarked()
  }, [projectId, date])

  async function fetchBaseData() {
    const { data: projectsData } = await supabase.from('projects').select('*')
    const { data: teamsData } = await supabase.from('labour_teams').select('*')
    const { data: typesData } = await supabase.from('labour_types').select('*')

    const typeMap = {}
    typesData.forEach((t) => {
      typeMap[t.team_id] = typeMap[t.team_id] || []
      typeMap[t.team_id].push(t)
    })

    setProjects(projectsData || [])
    setTeams(teamsData || [])
    setTypes(typeMap)
  }

  async function checkAttendanceMarked() {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date)

    if (data?.length > 0) {
      setAttendanceMarked(true)
      setRows(
        data.map((r) => ({
          teamId: String(r.team_id),
          typeId: String(r.labour_type_id),
          count: r.count.toString(),
        }))
      )
      setEditMode(false) // disable editing by default
    } else {
      setAttendanceMarked(false)
      setRows([{ teamId: '', typeId: '', count: '' }])
      setEditMode(true) // allow entry
    }
    setShowPreview(false)
  }

  const handleRowChange = (idx, field, val) => {
    const c = [...rows]
    c[idx][field] = val
    if (field === 'teamId') c[idx].typeId = ''
    setRows(c)
  }

  const addRow = () =>
    setRows([...rows, { teamId: '', typeId: '', count: '' }])

  const deleteRow = (idx) => {
    const c = [...rows]
    c.splice(idx, 1)
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
    setLoading(true)
    // delete old
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
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Attendance submitted!')
      setAttendanceMarked(true)
      setEditMode(false)
      setShowPreview(false)
    }
    setLoading(false)
  }

  const fetchAttendance = async () => {
    if (!projectId || !date) return alert('Select project and date')
    setLoading(true)
    const { data } = await supabase
      .from('attendance')
      .select('count, labour_types(type_name), labour_teams(name)')
      .eq('project_id', projectId)
      .eq('date', date)
    setViewResults(data || [])
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 20, background: '#f4f6f8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
          <h2>🏗️ SiteTrack</h2>
          <button onClick={onLogout} style={{ border: 'none', background: '#eee', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>Logout</button>
        </div>

        {/* Home */}
        {screen === 'home' && (
          <>
            <h3>Welcome, {user.email.split('@')[0]}</h3>
            <button style={primaryBtn} onClick={() => setScreen('enter')}>➕ Enter Attendance</button>
            <button style={secondaryBtn} onClick={() => setScreen('view')}>👁️ View Attendance</button>
            <button style={secondaryBtn} onClick={() => setScreen('work')}>📝 Work Done Report</button>
            <button style={secondaryBtn} onClick={() => setScreen('view-work')}>👁️ View Work Done Report</button>
          </>
        )}

        {/* View Attendance */}
        {screen === 'view' && (
          <div>
            <h3>View Attendance</h3>
            <select style={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value=''>-- Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type='date' style={input} value={date} onChange={(e) => setDate(e.target.value)} />
            <button style={primaryBtn} onClick={fetchAttendance}>View</button>
            <ul>
              {viewResults.map((r,i) => (
                <li key={i}>{r.name} – {r.type_name} – {r.count} nos</li>
              ))}
            </ul>
            <button style={secondaryBtn} onClick={() => setScreen('home')}>← Back</button>
          </div>
        )}

        {/* Enter / Edit Attendance */}
        {screen === 'enter' && (
          <div>
            <h3>Enter Attendance</h3>

            <select style={input} value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!editMode}>
              <option value=''>-- Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type='date' style={input} value={date} onChange={(e) => setDate(e.target.value)} disabled={!editMode} />

            {/* Already marked indicator + edit button */}
            {attendanceMarked && !editMode && (
              <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
                <p style={{ color:'green', margin:0 }}>✅ Attendance already marked</p>
                <button style={{ ...secondaryBtn, marginLeft:8 }} onClick={()=>setEditMode(true)}>✏️ Edit Attendance</button>
              </div>
            )}

            {/* Rows */}
            {rows.map((r, idx) => (
              <div key={idx} style={rowCard}>
                <button
                  onClick={() => deleteRow(idx)}
                  style={{ ...deleteBtn, visibility: editMode ? 'visible' : 'hidden' }}
                >×</button>
                <select
                  style={input}
                  value={r.teamId}
                  onChange={(e)=>handleRowChange(idx,'teamId',e.target.value)}
                  disabled={!editMode}
                >
                  <option value=''>-- Team --</option>
                  {teams.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select
                  style={input}
                  value={r.typeId}
                  onChange={(e)=>handleRowChange(idx,'typeId',e.target.value)}
                  disabled={!editMode || !r.teamId}
                >
                  <option value=''>-- Type --</option>
                  {(types[r.teamId]||[]).map(t=> <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                <input
                  type='number'
                  placeholder='No. of Batches'
                  style={input}
                  value={r.count}
                  onChange={(e)=>handleRowChange(idx,'count',e.target.value)}
                  disabled={!editMode}
                />
              </div>
            ))}

            {/* Add / Preview / Submit */}
            {editMode && (
              <>
                <button style={primaryBtn} onClick={addRow}>+ Add Team</button>
                <button style={secondaryBtn} onClick={()=>setShowPreview(true)}>👁️ Preview Summary</button>
                {showPreview && (
                  <div style={{ marginTop:16 }}>
                    <h4>Summary</h4>
                    <ul>
                      {rows.map((r,i)=> {
                        const t = teams.find(t=>t.id==r.teamId)?.name||'Team'
                        const ty = types[r.teamId]?.find(x=>x.id==r.typeId)?.type_name||'Type'
                        return <li key={i}>{t} – {ty} – {r.count} nos</li>
                      })}
                    </ul>
                    <button style={successBtn} onClick={handleSubmit} disabled={loading}>
                      ✅ {loading? 'Saving...' : 'Submit Attendance'}
                    </button>
                  </div>
                )}
              </>
            )}

            <button style={secondaryBtn} onClick={()=>setScreen('home')}>← Back</button>
          </div>
        )}

        {/* Work screens omitted for brevity */}
      </div>
    </div>
  )
}

// === styles ===
const input = {
  width:'100%',padding:12,marginBottom:12,fontSize:16,
  borderRadius:10,border:'1px solid #ccc',boxSizing:'border-box'
}
const primaryBtn = {
  ...input,background:'#1976d2',color:'#fff',cursor:'pointer'
}
const secondaryBtn = {
  ...input,background:'#666',color:'#fff',cursor:'pointer'
}
const successBtn = {
  ...input,background:'#2e7d32',color:'#fff',cursor:'pointer'
}
const rowCard = {
  background:'#fafafa',border:'1px solid #ddd',
  borderRadius:12,padding:16,marginBottom:16,position:'relative'
}
const deleteBtn = {
  position:'absolute',top:10,right:10,
  background:'#d32f2f',color:'#fff',border:'none',
  borderRadius:'50%',width:28,height:28,cursor:'pointer'
}