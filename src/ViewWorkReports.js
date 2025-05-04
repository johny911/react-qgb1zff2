// src/MainAttendanceApp.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import WorkReport from './WorkReport';
import ViewWorkReports from './ViewWorkReports';

export default function MainAttendanceApp({ user, onLogout }) {
  const [screen, setScreen] = useState('home');
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [rows, setRows] = useState([{ teamId: '', typeId: '', count: '' }]);
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [viewResults, setViewResults] = useState([]);

  useEffect(() => {
    async function fetchBaseData() {
      const { data: projectsData } = await supabase.from('projects').select('*');
      const { data: teamsData } = await supabase.from('labour_teams').select('*');
      const { data: typesData } = await supabase.from('labour_types').select('*');
      const typeMap = {};
      typesData.forEach(t => {
        typeMap[t.team_id] = typeMap[t.team_id] || [];
        typeMap[t.team_id].push(t);
      });
      setProjects(projectsData || []);
      setTeams(teamsData || []);
      setTypes(typeMap);
    }
    fetchBaseData();
  }, []);

  useEffect(() => {
    async function check() {
      if (!projectId || !date) return;
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', projectId)
        .eq('date', date);
      if (data?.length) {
        setAttendanceMarked(true);
        setRows(data.map(r => ({
          teamId: String(r.team_id),
          typeId: String(r.labour_type_id),
          count: String(r.count),
        })));
      } else {
        setAttendanceMarked(false);
        setRows([{ teamId: '', typeId: '', count: '' }]);
      }
    }
    check();
  }, [projectId, date]);

  const handleRowChange = (i, field, value) => {
    const u = [...rows];
    u[i][field] = value;
    if (field === 'teamId') u[i].typeId = '';
    setRows(u);
  };
  const addRow = () => setRows([...rows, { teamId: '', typeId: '', count: '' }]);
  const deleteRow = i => {
    const u = [...rows]; u.splice(i, 1);
    setRows(u.length ? u : [{ teamId: '', typeId: '', count: '' }]);
  };

  const handleSubmit = async () => {
    if (!projectId || !date || rows.some(r => !r.teamId || !r.typeId || !r.count)) {
      return alert('Please fill all fields');
    }
    setLoading(true);
    await supabase
      .from('attendance')
      .delete()
      .eq('project_id', projectId)
      .eq('date', date);
    const payload = rows.map(r => ({
      project_id: projectId,
      date,
      team_id: r.teamId,
      labour_type_id: r.typeId,
      count: parseInt(r.count, 10),
    }));
    const { error } = await supabase.from('attendance').insert(payload);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Attendance submitted!');
      setAttendanceMarked(true);
      setShowPreview(false);
    }
    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!projectId || !date) return alert('Select project and date');
    setLoading(true);
    const { data } = await supabase
      .from('attendance')
      .select('count, labour_types(type_name), labour_teams(name)')
      .eq('project_id', projectId)
      .eq('date', date);
    setViewResults(data || []);
    setLoading(false);
  };

  return (
    <div style={{ fontFamily: 'system-ui', padding: 20, background: '#f4f6f8', minHeight: '100vh' }}>
      <div style={{ maxWidth: 460, margin: 'auto', background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2>🏗️ SiteTrack</h2>
          <button onClick={onLogout} style={secondaryBtn}>Logout</button>
        </header>

        {screen === 'home' && (
          <>
            <h3>Welcome, {user.email.split('@')[0]}</h3>
            <button style={primaryBtn} onClick={() => setScreen('enter')}>➕ Enter Attendance</button>
            <button style={secondaryBtn} onClick={() => setScreen('view')}>👁️ View Attendance</button>
            <button style={secondaryBtn} onClick={() => setScreen('work')}>📝 Enter Work Done Report</button>
            <button style={secondaryBtn} onClick={() => setScreen('view-work')}>👁️ View Work Done Report</button>
          </>
        )}

        {screen === 'view' && (
          <div>
            <h3>View Attendance</h3>
            <select style={input} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">-- Select Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" style={input} value={date} onChange={e => setDate(e.target.value)} />
            <button style={primaryBtn} onClick={fetchAttendance}>View</button>
            <ul>
              {viewResults.map((r,i) =>
                <li key={i}>{r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos</li>
              )}
            </ul>
            <button style={secondaryBtn} onClick={() => setScreen('home')}>← Back</button>
          </div>
        )}

        {screen === 'enter' && (
          <div>
            <h3>Enter Attendance</h3>
            <select style={input} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">-- Select Project --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" style={input} value={date} onChange={e => setDate(e.target.value)} />
            {attendanceMarked && <p style={{ color: 'green' }}>✅ Attendance already marked</p>}

            {rows.map((row,i) => (
              <div key={i} style={rowBox}>
                <select style={input} value={row.teamId} onChange={e => handleRowChange(i,'teamId',e.target.value)}>
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select style={input} value={row.typeId} onChange={e => handleRowChange(i,'typeId',e.target.value)}>
                  <option value="">Select Labour Type</option>
                  {(types[row.teamId]||[]).map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                <input type="number" placeholder="No. of Workers" style={input} value={row.count} onChange={e => handleRowChange(i,'count',e.target.value)} />
                <button onClick={() => deleteRow(i)} style={deleteBtn}>🗑️</button>
              </div>
            ))}

            <button style={secondaryBtn} onClick={addRow}>+ Add Team</button>
            <button style={secondaryBtn} onClick={() => setShowPreview(true)}>👁️ Preview Summary</button>

            {showPreview && (
              <div style={{ marginTop: 12 }}>
                <h4>Summary</h4>
                <ul>
                  {rows.map((r,i) => {
                    const team = teams.find(t => String(t.id)===r.teamId)?.name || 'Unknown';
                    const type = types[r.teamId]?.find(tt => String(tt.id)===r.typeId)?.type_name || 'Unknown';
                    return <li key={i}>{team} – {type} – {r.count} nos</li>;
                  })}
                </ul>
                <button style={primaryBtn} onClick={handleSubmit}>✅ Submit Attendance</button>
              </div>
            )}
            <button style={secondaryBtn} onClick={() => setScreen('home')}>← Back</button>
          </div>
        )}

        {screen === 'work' && (
          <WorkReport
            goHome={() => setScreen('home')}
          />
        )}

        {screen === 'view-work' && (
          <ViewWorkReports
            onBack={() => setScreen('home')}
          />
        )}
      </div>
    </div>
  )
}

const input = { width:'100%', padding:12, marginBottom:12, fontSize:16, borderRadius:10, border:'1px solid #ccc', boxSizing:'border-box' };
const rowBox = { border:'1px solid #ddd', padding:12, borderRadius:10, marginBottom:12, position:'relative' };
const deleteBtn = { position:'absolute', top:8, right:8, background:'transparent', border:'none', fontSize:18, cursor:'pointer', color:'red' };
const primaryBtn = { background:'#3b6ef6', color:'#fff', padding:14, borderRadius:10, border:'none', width:'100%', fontSize:16, marginBottom:12, cursor:'pointer' };
const secondaryBtn = { background:'#eee', color:'#333', padding:12, borderRadius:10, border:'none', width:'100%', fontSize:16, marginBottom:12, cursor:'pointer' };