// ✅ Full App.js with Modern UI Dropdowns and Fixed Layout

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FaTrash } from 'react-icons/fa';

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
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showPreview, setShowPreview] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (projectId && date) checkAttendanceStatus();
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

  async function checkAttendanceStatus() {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);

    setAttendanceMarked((data || []).length > 0);
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
      setRows([{ teamId: '', typeId: '', count: '' }]);
      setShowPreview(false);
      checkAttendanceStatus();
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {screen === 'home' && (
          <div style={styles.card}>
            <h2 style={styles.heading}>👷‍♂️ SiteTrack</h2>
            <button style={styles.primaryBtn} onClick={() => setScreen('enter')}>
              + Enter Attendance
            </button>
          </div>
        )}

        {screen === 'enter' && (
          <div style={styles.card}>
            <h3>Enter Attendance</h3>

            <select
              style={styles.input}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <input
              type="date"
              style={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            {attendanceMarked && (
              <div style={{ ...styles.statusBox, color: 'green' }}>
                ✅ Attendance marked
              </div>
            )}

            {rows.map((row, index) => (
              <div key={index} style={styles.rowCard}>
                <div style={styles.rowHeader}>
                  <b>Team Entry</b>
                  <button onClick={() => deleteRow(index)} style={styles.trashBtn}>
                    <FaTrash />
                  </button>
                </div>
                <select
                  style={styles.input}
                  value={row.teamId}
                  onChange={(e) => handleRowChange(index, 'teamId', e.target.value)}
                >
                  <option value="">Select Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <select
                  style={styles.input}
                  value={row.typeId}
                  onChange={(e) => handleRowChange(index, 'typeId', e.target.value)}
                  disabled={!row.teamId}
                >
                  <option value="">Select Labour Type</option>
                  {(types[row.teamId] || []).map((type) => (
                    <option key={type.id} value={type.id}>{type.type_name}</option>
                  ))}
                </select>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="Number of Workers"
                  value={row.count}
                  onChange={(e) => handleRowChange(index, 'count', e.target.value)}
                />
              </div>
            ))}

            <button style={styles.addBtn} onClick={addRow}>+ Add Team</button>
            <button style={styles.secondaryBtn} onClick={() => setShowPreview(true)}>
              Preview Summary
            </button>
            <button style={styles.primaryBtn} onClick={handleSubmit}>Submit Attendance</button>
            <button style={styles.secondaryBtn} onClick={() => setScreen('home')}>Back</button>
          </div>
        )}

        {showPreview && (
          <div style={styles.card}>
            <h4>Summary</h4>
            <ul>
              {rows.map((r, i) => {
                const team = teams.find((t) => t.id == r.teamId)?.name || 'Team';
                const type = types[r.teamId]?.find((t) => t.id == r.typeId)?.type_name || 'Type';
                return (
                  <li key={i}>{team} – {type} – {r.count} nos</li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100vw',
    minHeight: '100vh',
    overflowX: 'hidden',
    background: '#f2f4f8',
    padding: '20px 0',
    boxSizing: 'border-box',
  },
  container: {
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    fontFamily: 'system-ui, sans-serif',
    padding: '0 16px'
  },
  card: {
    background: '#fff',
    borderRadius: '14px',
    padding: '20px 16px',
    marginBottom: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    boxSizing: 'border-box',
  },
  heading: {
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '1px solid #ccc',
    marginBottom: '12px',
    boxSizing: 'border-box',
    appearance: 'none'
  },
  rowCard: {
    background: '#fafafa',
    border: '1px solid #ddd',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    position: 'relative',
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  trashBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '16px',
    color: 'red',
    cursor: 'pointer'
  },
  primaryBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    borderRadius: '10px',
    border: 'none',
    background: '#1976d2',
    color: '#fff',
    marginBottom: '12px',
    cursor: 'pointer',
  },
  secondaryBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    borderRadius: '10px',
    border: 'none',
    background: '#ccc',
    color: '#000',
    marginBottom: '12px',
    cursor: 'pointer',
  },
  addBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '2px dashed #1976d2',
    background: 'transparent',
    color: '#1976d2',
    marginBottom: '12px',
    cursor: 'pointer',
  },
  statusBox: {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '8px',
    background: '#e6f4ea',
    fontWeight: '500'
  }
};
