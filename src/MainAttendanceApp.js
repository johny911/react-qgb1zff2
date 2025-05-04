import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import WorkReport from './WorkReport'
import ViewWorkReports from './ViewWorkReports'

export default function MainAttendanceApp({ user, onLogout }) {
  const [screen, setScreen] = useState('home')
  const [projects, setProjects] = useState([])
  const [teams, setTeams]       = useState([])
  const [types, setTypes]       = useState({})
  const [rows, setRows]         = useState([{ teamId: '', typeId: '', count: '' }])
  const [projectId, setProjectId] = useState('')
  const [date, setDate]           = useState(() => new Date().toISOString().split('T')[0])
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [editMode, setEditMode]               = useState(true)
  const [showPreview, setShowPreview]         = useState(false)
  const [viewResults, setViewResults]         = useState([])

  // Load dropdown data
  useEffect(() => {
    ;(async () => {
      const { data: p } = await supabase.from('projects').select('id,name')
      const { data: t } = await supabase.from('labour_teams').select('id,name')
      const { data: ty } = await supabase.from('labour_types').select('id,team_id,type_name')
      const map = {}
      ty.forEach(x => {
        map[x.team_id] = map[x.team_id] || []
        map[x.team_id].push(x)
      })
      setProjects(p || [])
      setTeams(t || [])
      setTypes(map)
    })()
  }, [])

  // Check if attendance exists whenever project or date changes
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
          data.map(r => ({
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

  // Handlers for attendance form
  const handleRowChange = (i, f, v) => {
    const c = [...rows]
    c[i][f] = v
    if (f === 'teamId') c[i].typeId = ''
    setRows(c)
  }
  const addRow = () =>
    setRows([...rows, { teamId: '', typeId: '', count: '' }])
  const deleteRow = i => {
    const c = [...rows]
    c.splice(i, 1)
    setRows(c.length ? c : [{ teamId: '', typeId: '', count: '' }])
  }
  const handleSubmit = async () => {
    if (!projectId || !date || rows.some(r => !r.teamId || !r.typeId || !r.count)) {
      return alert('Please fill all fields')
    }
    // delete old
    await supabase
      .from('attendance')
      .delete()
      .eq('project_id', projectId)
      .eq('date', date)
    // insert new
    const payload = rows.map(r => ({
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

  // View attendance
  const fetchAttendance = async () => {
    if (!projectId || !date) return alert('Select project & date')
    const { data } = await supabase
      .from('attendance')
      .select('count, labour_teams(name), labour_types(type_name)')
      .eq('project_id', projectId)
      .eq('date', date)
    setViewResults(data || [])
  }

  return (
    <div style={wrapper}>
      <div style={container}>
        {/* Header */}
        <div style={header}>
          <h2>🏗️ SiteTrack</h2>
          <button onClick={onLogout} style={btnSecondary}>Logout</button>
        </div>

        {/* Home */}
        {screen === 'home' && (
          <>
            <h3>Welcome, {user.email.split('@')[0]}</h3>
            <button style={btnPrimary} onClick={() => setScreen('enter')}>➕ Enter Attendance</button>
            <button style={btnSecondary} onClick={() => setScreen('view')}>👁️ View Attendance</button>
            <button style={btnSecondary} onClick={() => setScreen('work')}>📝 Work Done Report</button>
            <button style={btnSecondary} onClick={() => setScreen('view-work')}>👁️ View Work Done Report</button>
          </>
        )}

        {/* View Attendance */}
        {screen === 'view' && (
          <div>
            <h3>View Attendance</h3>
            <select style={input} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value=''>-- Select Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type='date' style={input} value={date} onChange={e => setDate(e.target.value)} />
            <button style={btnPrimary} onClick={fetchAttendance}>View</button>
            <ul>
              {viewResults.map((r,i) => (
                <li key={i}>
                  {r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos
                </li>
              ))}
            </ul>
            <button style={btnSecondary} onClick={() => setScreen('home')}>← Back</button>
          </div>
        )}

        {/* Enter / Edit Attendance */}
        {screen === 'enter' && (
          <div>
            <h3>Enter Attendance</h3>
            <select
              style={input}
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              disabled={!editMode}
            >
              <option value=''>-- Select Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input
              type='date'
              style={input}
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={!editMode}
            />
            {attendanceMarked && !editMode && (
              <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
                <p style={{ color:'green', margin:0 }}>✅ Attendance already marked</p>
                <button style={btnSecondary} onClick={() => setEditMode(true)}>✏️ Edit Attendance</button>
              </div>
            )}
            {rows.map((r,i) => (
              <div key={i} style={rowCard}>
                <button
                  style={{ ...deleteBtn, visibility: editMode ? 'visible' : 'hidden' }}
                  onClick={() => deleteRow(i)}
                >×</button>
                <select
                  style={input}
                  value={r.teamId}
                  onChange={e => handleRowChange(i,'teamId',e.target.value)}
                  disabled={!editMode}
                >
                  <option value=''>-- Team --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select
                  style={input}
                  value={r.typeId}
                  onChange={e => handleRowChange(i,'typeId',e.target.value)}
                  disabled={!editMode || !r.teamId}
                >
                  <option value=''>-- Type --</option>
                  {(types[r.teamId]||[]).map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                <input
                  type='number'
                  placeholder='No. of Batches'
                  style={input}
                  value={r.count}
                  onChange={e => handleRowChange(i,'count',e.target.value)}
                  disabled={!editMode}
                />
              </div>
            ))}
            {editMode && (
              <>
                <button style={btnPrimary} onClick={addRow}>+ Add Team</button>
                <button style={btnSecondary} onClick={() => setShowPreview(true)}>👁️ Preview Summary</button>
                {showPreview && (
                  <div style={{ marginTop:16 }}>
                    <h4>Summary</h4>
                    <ul>
                      {rows.map((r,i) => {
                        const t = teams.find(t => t.id == r.teamId)?.name || 'Team'
                        const ty = types[r.teamId]?.find(x => x.id == r.typeId)?.type_name || 'Type'
                        return <li key={i}>{t} – {ty} – {r.count} nos</li>
                      })}
                    </ul>
                    <button style={btnSuccess} onClick={handleSubmit}>✅ Save Attendance</button>
                  </div>
                )}
              </>
            )}
            <button style={btnSecondary} onClick={() => setScreen('home')}>← Back</button>
          </div>
        )}

        {/* Work Done Report */}
        {screen === 'work' && <WorkReport onBack={() => setScreen('home')} />}

        {/* View Work Reports */}
        {screen === 'view-work' && <ViewWorkReports onBack={() => setScreen('home')} />}
      </div>
    </div>
  )
}

// Styles
const wrapper = { fontFamily:'system-ui', background:'#f4f6f8', minHeight:'100vh', padding:20 }
const container = { maxWidth:460, margin:'0 auto', background:'#fff', padding:24, borderRadius:16, boxShadow:'0 4px 20px rgba(0,0,0,0.05)' }
const header = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }
const input = { width:'100%', padding:12, marginBottom:12, borderRadius:10, border:'1px solid #ccc', boxSizing:'border-box' }
const btnPrimary = { ...input, background:'#1976d2', color:'#fff', cursor:'pointer' }
const btnSecondary = { ...input, background:'#666', color:'#fff', cursor:'pointer' }
const btnSuccess = { ...input, background:'#2e7d32', color:'#fff', cursor:'pointer' }
const rowCard = { position:'relative', background:'#fafafa', border:'1px solid #ddd', borderRadius:12, padding:16, marginBottom:16 }
const deleteBtn = { position:'absolute', top:10, right:10, background:'#d32f2f', color:'#fff', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer' }