import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hftkpcltkuewskmtkmbq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdGtwY2x0a3Vld3NrbXRrbWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMTUxMjYsImV4cCI6MjA2MTY5MTEyNn0.sPBgUfablM1Nh1fX1wBeeYHTL-6rljiDUVqeh4c0t_0'
);

export default function App() {
  const [screen, setScreen] = useState('home');
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [rows, setRows] = useState([{ teamId: '', typeId: '', count: '' }]);
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [viewResults, setViewResults] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchBaseData();
  }, []);

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

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    if (field === 'teamId') updated[index].typeId = '';
    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { teamId: '', typeId: '', count: '' }]);
  };

  const deleteRow = (index) => {
    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated.length ? updated : [{ teamId: '', typeId: '', count: '' }]);
  };

  const handleSubmit = async () => {
    if (
      !projectId ||
      !date ||
      rows.some((r) => !r.teamId || !r.typeId || !r.count)
    ) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    const payload = rows.map((row) => ({
      project_id: projectId,
      date,
      team_id: row.teamId,
      labour_type_id: row.typeId,
      count: parseInt(row.count),
    }));

    const { error } = await supabase.from('attendance').insert(payload);
    if (error) alert('Error submitting attendance: ' + error.message);
    else {
      alert('Attendance submitted successfully!');
      setRows([{ teamId: '', typeId: '', count: '' }]);
      setShowPreview(false);
    }

    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!projectId || !date) {
      alert('Select project and date');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('attendance')
      .select('count, labour_types(type_name), labour_teams(name)')
      .eq('project_id', projectId)
      .eq('date', date);

    if (error) alert('Failed to fetch attendance');
    else setViewResults(data);

    setLoading(false);
  };

  const container = {
    maxWidth: '480px',
    margin: 'auto',
    padding: '20px',
    fontFamily: "'Segoe UI', sans-serif",
    color: '#222',
  };

  const card = {
    background: '#fff',
    padding: '20px',
    borderRadius: '14px',
    boxShadow: '0 0 12px rgba(0,0,0,0.04)',
    marginBottom: '20px',
  };

  const rowCard = {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '15px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    position: 'relative',
  };

  const input = {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '10px',
  };

  const button = {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    background: '#1e88e5',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    marginBottom: '10px',
  };

  const backButton = { ...button, background: '#999' };

  const deleteBtn = {
    position: 'absolute',
    top: 10,
    right: 10,
    background: '#e53935',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 30,
    height: 30,
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  if (screen === 'home') {
    return (
      <div style={container}>
        <div style={card}>
          <h2 style={{ marginBottom: 20 }}>Labour Attendance</h2>
          <button style={button} onClick={() => setScreen('enter')}>
            ➕ Enter Attendance
          </button>
          <button style={button} onClick={() => setScreen('view')}>
            👁️ View Attendance
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'view') {
    return (
      <div style={container}>
        <div style={card}>
          <h3>View Attendance</h3>
          <select
            style={input}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">-- Select Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            style={input}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button style={button} onClick={fetchAttendance} disabled={loading}>
            {loading ? 'Loading...' : 'View'}
          </button>
          {viewResults.length > 0 && (
            <ul>
              {viewResults.map((entry, index) => (
                <li key={index}>
                  {entry.labour_teams.name} – {entry.labour_types.type_name} –{' '}
                  {entry.count} nos
                </li>
              ))}
            </ul>
          )}
          <button style={backButton} onClick={() => setScreen('home')}>
            🔙 Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={card}>
        <h3>Enter Attendance</h3>
        <select
          style={input}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">-- Select Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          style={input}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {rows.map((row, index) => (
          <div key={index} style={rowCard}>
            <button onClick={() => deleteRow(index)} style={deleteBtn}>
              ×
            </button>
            <select
              style={input}
              value={row.teamId}
              onChange={(e) => handleRowChange(index, 'teamId', e.target.value)}
            >
              <option value="">-- Select Team --</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <select
              style={input}
              value={row.typeId}
              onChange={(e) => handleRowChange(index, 'typeId', e.target.value)}
              disabled={!row.teamId}
            >
              <option value="">-- Select Type --</option>
              {(types[row.teamId] || []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.type_name}
                </option>
              ))}
            </select>
            <input
              style={input}
              type="number"
              placeholder="No. of Batches"
              value={row.count}
              onChange={(e) => handleRowChange(index, 'count', e.target.value)}
            />
          </div>
        ))}

        <button style={button} onClick={addRow}>
          + Add Team
        </button>
        <button style={button} onClick={() => setShowPreview(true)}>
          👁️ Preview Summary
        </button>

        {showPreview && (
          <div
            style={{
              marginTop: 20,
              borderTop: '1px solid #ddd',
              paddingTop: 10,
            }}
          >
            <h4>Summary</h4>
            <ul>
              {rows.map((r, i) => {
                const team =
                  teams.find((t) => t.id == r.teamId)?.name || 'Team';
                const type =
                  types[r.teamId]?.find((t) => t.id == r.typeId)?.type_name ||
                  'Type';
                return (
                  <li key={i}>
                    {team} – {type} – {r.count} nos
                  </li>
                );
              })}
            </ul>
            <button
              style={{ ...button, background: '#43a047' }}
              onClick={handleSubmit}
            >
              ✅ Submit Attendance
            </button>
          </div>
        )}

        <button style={backButton} onClick={() => setScreen('home')}>
          🔙 Back
        </button>
      </div>
    </div>
  );
}
