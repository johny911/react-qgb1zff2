// ✅ Styled Attendance App with Smart Dropdowns + Edit Mode + Attendance Status
// React + Supabase with Clean Mobile UI

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hftkpcltkuewskmtkmbq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdGtwY2x0a3Vld3NrbXRrbWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMTUxMjYsImV4cCI6MjA2MTY5MTEyNn0.sPBgUfablM1Nh1fX1wBeeYHTL-6rljiDUVqeh4c0t_0'
);

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home');
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [rows, setRows] = useState([{ teamId: '', typeId: '', count: '' }]);
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [viewResults, setViewResults] = useState([]);
  const [marked, setMarked] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchBaseData();
  }, []);

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const fetchBaseData = async () => {
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
  };

  useEffect(() => {
    if (projectId && date) {
      checkMarked();
    }
  }, [projectId, date]);

  const checkMarked = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);

    if (data && data.length > 0) {
      setMarked(true);
      setExistingAttendance(data);
      const mapped = data.map((item) => ({
        teamId: item.team_id,
        typeId: item.labour_type_id,
        count: item.count.toString(),
      }));
      setRows(mapped);
    } else {
      setMarked(false);
      setRows([{ teamId: '', typeId: '', count: '' }]);
    }
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    if (field === 'teamId') updated[index].typeId = '';
    setRows(updated);
  };

  const addRow = () =>
    setRows([...rows, { teamId: '', typeId: '', count: '' }]);

  const deleteRow = (index) => {
    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated.length ? updated : [{ teamId: '', typeId: '', count: '' }]);
  };

  const handleSubmit = async () => {
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
      alert('Attendance saved!');
      setMarked(true);
      setShowPreview(false);
      setScreen('home');
    }
  };

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('count, labour_types(type_name), labour_teams(name)')
      .eq('project_id', projectId)
      .eq('date', date);
    setViewResults(data || []);
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
        background: '#f5f6fa',
        minHeight: '100vh',
      }}
    >
      {screen === 'home' && (
        <div>
          <h2 style={{ fontWeight: 'bold' }}>
            Good Morning, {user?.email?.split('@')[0]} 👋
          </h2>
          <p style={{ color: '#666', marginBottom: 24 }}>
            Track your site attendance
          </p>
          <div style={cardBtn} onClick={() => setScreen('enter')}>
            ➕ Enter Attendance
          </div>
          <div style={cardBtn} onClick={() => setScreen('view')}>
            👁️ View Attendance
          </div>
        </div>
      )}

      {screen === 'enter' && (
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>
            ← Enter Attendance
          </h3>
          <select
            style={dropdownStyle}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            style={dropdownStyle}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {marked && (
            <div
              style={{
                background: '#e0f8e9',
                color: '#2e7d32',
                padding: 12,
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              ✅ Attendance marked
            </div>
          )}

          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                padding: 16,
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <strong>Team Entry</strong>
                <button
                  onClick={() => deleteRow(i)}
                  style={{ border: 'none', background: 'none', fontSize: 18 }}
                >
                  🗑️
                </button>
              </div>
              <select
                style={dropdownStyle}
                value={row.teamId}
                onChange={(e) => handleRowChange(i, 'teamId', e.target.value)}
              >
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                style={dropdownStyle}
                value={row.typeId}
                onChange={(e) => handleRowChange(i, 'typeId', e.target.value)}
                disabled={!row.teamId}
              >
                <option value="">Select Labor Type</option>
                {(types[row.teamId] || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.type_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Number of Workers"
                style={dropdownStyle}
                value={row.count}
                onChange={(e) => handleRowChange(i, 'count', e.target.value)}
              />
            </div>
          ))}

          <div
            onClick={addRow}
            style={{
              border: '2px dashed #3f51b5',
              padding: 16,
              borderRadius: 12,
              textAlign: 'center',
              color: '#3f51b5',
              fontWeight: 500,
              marginBottom: 20,
              cursor: 'pointer',
            }}
          >
            + Add Team
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={outlineBtn} onClick={() => setShowPreview(true)}>
              Preview Summary
            </button>
            <button style={primaryBtn} onClick={handleSubmit}>
              Submit Attendance
            </button>
          </div>

          <button style={backBtn} onClick={() => setScreen('home')}>
            ← Back
          </button>
        </div>
      )}

      {screen === 'view' && (
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>
            ← View Attendance
          </h3>
          <select
            style={dropdownStyle}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            style={dropdownStyle}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button style={primaryBtn} onClick={fetchAttendance}>
            View
          </button>

          {viewResults.map((r, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                padding: 16,
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div>
                <strong>{r.labour_teams.name}</strong>
                <br />
                {r.labour_types.type_name} – {r.count} nos
              </div>
              <span>👁️</span>
            </div>
          ))}

          <button style={backBtn} onClick={() => setScreen('home')}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}

const dropdownStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid #ccc',
  marginBottom: '12px',
  fontSize: '16px',
};
const primaryBtn = {
  flex: 1,
  background: '#3f51b5',
  color: '#fff',
  padding: 14,
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
};
const outlineBtn = {
  flex: 1,
  background: '#fff',
  border: '1px solid #ccc',
  padding: 14,
  borderRadius: 10,
  cursor: 'pointer',
};
const backBtn = {
  marginTop: 20,
  color: '#3f51b5',
  background: 'none',
  border: 'none',
  fontSize: 16,
  cursor: 'pointer',
};
const cardBtn = {
  background: '#fff',
  padding: 20,
  borderRadius: 14,
  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  marginBottom: 16,
  cursor: 'pointer',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};
