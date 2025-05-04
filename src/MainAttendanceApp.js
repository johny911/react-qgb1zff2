// src/MainAttendanceApp.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

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
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (projectId && date) checkAttendanceMarked();
  }, [projectId, date]);

  async function fetchBaseData() {
    const { data: projectsData } = await supabase.from('projects').select('*');
    const { data: teamsData } = await supabase.from('labour_teams').select('*');
    const { data: typesData } = await supabase.from('labour_types').select('*');

    const typeMap = {};
    typesData.forEach((type) => {
      if (!typeMap[type.team_id]) typeMap[type.team_id] = [];
      typeMap[type.team_id].push(type);
    });

    setProjects(projectsData || []);
    setTeams(teamsData || []);
    setTypes(typeMap);
  }

  async function checkAttendanceMarked() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);
    if (error) return;
    if (data.length > 0) {
      setAttendanceMarked(true);
      setRows(
        data.map((r) => ({
          teamId: r.team_id,
          typeId: r.labour_type_id,
          count: r.count.toString(),
        }))
      );
    } else {
      setAttendanceMarked(false);
      setRows([{ teamId: '', typeId: '', count: '' }]);
    }
  }

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    if (field === 'teamId') updated[index].typeId = '';
    setRows(updated);
  };

  const addRow = () => setRows([...rows, { teamId: '', typeId: '', count: '' }]);

  const deleteRow = (index) => {
    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated.length ? updated : [{ teamId: '', typeId: '', count: '' }]);
  };

  const handleSubmit = async () => {
    if (!projectId || !date || rows.some((r) => !r.teamId || !r.typeId || !r.count)) {
      alert('Please fill all fields');
      return;
    }
    setLoading(true);
    await supabase
      .from('attendance')
      .delete()
      .eq('project_id', projectId)
      .eq('date', date);

    const payload = rows.map((row) => ({
      project_id: projectId,
      date,
      team_id: row.teamId,
      labour_type_id: row.typeId,
      count: parseInt(row.count),
    }));

    const { error } = await supabase.from('attendance').insert(payload);
    if (error) alert('Error: ' + error.message);
    else {
      alert('Attendance submitted!');
      setShowPreview(false);
      setAttendanceMarked(true);
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
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>👷 SiteTrack</h2>
        <button onClick={onLogout}>Logout</button>
      </div>

      {screen === 'home' && (
        <>
          <h3>Welcome, {user.email.split('@')[0]}</h3>
          <button onClick={() => setScreen('enter')}>➕ Enter Attendance</button>
          <button onClick={() => setScreen('view')}>👁️ View Attendance</button>
        </>
      )}

      {screen === 'view' && (
        <div>
          <h3>View Attendance</h3>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">-- Select Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={fetchAttendance}>View</button>
          <ul>
            {viewResults.map((r, i) => (
              <li key={i}>{r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos</li>
            ))}
          </ul>
          <button onClick={() => setScreen('home')}>Back</button>
        </div>
      )}

      {screen === 'enter' && (
        <div>
          <h3>Enter Attendance</h3>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">-- Select Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          {attendanceMarked && <p style={{ color: 'green' }}>✅ Attendance marked</p>}

          {rows.map((row, i) => (
            <div key={i} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
              <select value={row.teamId} onChange={(e) => handleRowChange(i, 'teamId', e.target.value)}>
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select value={row.typeId} onChange={(e) => handleRowChange(i, 'typeId', e.target.value)}>
                <option value="">Select Labour Type</option>
                {(types[row.teamId] || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.type_name}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Number of Workers"
                value={row.count}
                onChange={(e) => handleRowChange(i, 'count', e.target.value)}
              />
              <button onClick={() => deleteRow(i)}>🗑️</button>
            </div>
          ))}

          <button onClick={addRow}>+ Add Team</button>
          <button onClick={() => setShowPreview(true)}>👁️ Preview Summary</button>

          {showPreview && (
            <div>
              <h4>Summary</h4>
              <ul>
                {rows.map((r, i) => (
                  <li key={i}>
                    {teams.find((t) => t.id === r.teamId)?.name} –
                    {types[r.teamId]?.find((t) => t.id === r.typeId)?.type_name} –
                    {r.count} nos
                  </li>
                ))}
              </ul>
              <button onClick={handleSubmit}>✅ Submit Attendance</button>
            </div>
          )}

          <button onClick={() => setScreen('home')}>Back</button>
        </div>
      )}
    </div>
  );
}
