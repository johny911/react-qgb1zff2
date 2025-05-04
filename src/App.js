import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FaUserCircle, FaPlus, FaEye, FaTrash } from 'react-icons/fa';

const supabase = createClient(
  'https://hftkpcltkuewskmtkmbq.supabase.co',
  'YeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdGtwY2x0a3Vld3NrbXRrbWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMTUxMjYsImV4cCI6MjA2MTY5MTEyNn0.sPBgUfablM1Nh1fX1wBeeYHTL-6rljiDUVqeh4c0t_0'
);

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [rows, setRows] = useState([{ teamId: '', typeId: '', count: '' }]);
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [viewResults, setViewResults] = useState([]);

  useEffect(() => {
    checkUser();
    fetchBaseData();
  }, []);

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setScreen('home');
    }
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (!error) alert('Check your email for login link');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setScreen('login');
  }

  async function fetchBaseData() {
    const { data: projectsData } = await supabase.from('projects').select('*');
    const { data: teamsData } = await supabase.from('labour_teams').select('*');
    const { data: typesData } = await supabase.from('labour_types').select('*');

    const map = {};
    typesData.forEach((type) => {
      if (!map[type.team_id]) map[type.team_id] = [];
      map[type.team_id].push(type);
    });

    setProjects(projectsData || []);
    setTeams(teamsData || []);
    setTypes(map);
  }

  useEffect(() => {
    if (projectId && date) checkAttendanceMarked();
  }, [projectId, date]);

  async function checkAttendanceMarked() {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);
    setAttendanceMarked(data.length > 0);
    if (data.length > 0) {
      const formatted = data.map((d) => ({
        teamId: d.team_id,
        typeId: d.labour_type_id,
        count: d.count,
      }));
      setRows(formatted);
    } else {
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
      alert('Fill all fields');
      return;
    }

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
    if (error) alert('Error submitting: ' + error.message);
    else alert('Attendance saved!');
  };

  async function fetchAttendance() {
    if (!projectId || !date) return alert('Select project and date');
    const { data } = await supabase
      .from('attendance')
      .select('count, labour_types(type_name), labour_teams(name)')
      .eq('project_id', projectId)
      .eq('date', date);
    setViewResults(data || []);
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 20 }}>
      {screen === 'login' && (
        <div>
          <h2>Login to SiteTrack</h2>
          <input
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={input}
          />
          <button style={btnPrimary} onClick={signIn}>Send Magic Link</button>
        </div>
      )}

      {screen !== 'login' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3>👷 SiteTrack</h3>
              <p>Good Morning, {user?.email}</p>
            </div>
            <button onClick={signOut} style={btnSmall}>
              <FaUserCircle /> Logout
            </button>
          </div>

          {screen === 'home' && (
            <>
              <button style={cardBtn} onClick={() => setScreen('enter')}>
                <FaPlus /> Enter Attendance
              </button>
              <button style={cardBtn} onClick={() => setScreen('view')}>
                <FaEye /> View Attendance
              </button>
            </>
          )}

          {screen === 'enter' && (
            <>
              <h3>Enter Attendance</h3>
              <select style={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
              {attendanceMarked && <p style={{ color: 'green' }}>✅ Attendance marked</p>}
              {!attendanceMarked && <p style={{ color: 'red' }}>⚠️ Attendance not marked</p>}

              {rows.map((row, index) => (
                <div key={index} style={box}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Team Entry</strong>
                    <FaTrash onClick={() => deleteRow(index)} style={{ color: 'red', cursor: 'pointer' }} />
                  </div>
                  <select
                    style={input}
                    value={row.teamId}
                    onChange={(e) => handleRowChange(index, 'teamId', e.target.value)}
                  >
                    <option value="">Select Team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    style={input}
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
                    type="number"
                    placeholder="Number of Workers"
                    style={input}
                    value={row.count}
                    onChange={(e) => handleRowChange(index, 'count', e.target.value)}
                  />
                </div>
              ))}
              <div style={dashedBtn} onClick={addRow}>+ Add Team</div>
              <button style={btnPrimary} onClick={handleSubmit}>Submit Attendance</button>
              <button style={btnBack} onClick={() => setScreen('home')}>← Back</button>
            </>
          )}

          {screen === 'view' && (
            <>
              <h3>View Attendance</h3>
              <select style={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
              <button style={btnPrimary} onClick={fetchAttendance}>Fetch</button>
              <ul>
                {viewResults.map((r, i) => (
                  <li key={i}>{r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos</li>
                ))}
              </ul>
              <button style={btnBack} onClick={() => setScreen('home')}>← Back</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Reusable styles
const input = {
  width: '100%',
  padding: '10px',
  marginBottom: 12,
  borderRadius: 8,
  border: '1px solid #ccc',
};

const btnPrimary = {
  background: '#1976d2',
  color: '#fff',
  padding: '12px',
  border: 'none',
  borderRadius: 8,
  width: '100%',
  marginBottom: 12,
  fontSize: 16,
  cursor: 'pointer',
};

const btnSmall = {
  background: '#ccc',
  border: 'none',
  padding: '8px 12px',
  borderRadius: 6,
  cursor: 'pointer',
};

const btnBack = {
  background: '#ddd',
  border: 'none',
  padding: '12px',
  width: '100%',
  borderRadius: 8,
  cursor: 'pointer',
};

const dashedBtn = {
  border: '2px dashed #1976d2',
  padding: '12px',
  textAlign: 'center',
  marginBottom: 16,
  borderRadius: 8,
  cursor: 'pointer',
  color: '#1976d2',
};

const box = {
  background: '#f7f7f7',
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
};

const cardBtn = {
  background: '#fff',
  padding: 20,
  borderRadius: 14,
  boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
  marginBottom: 16,
  cursor: 'pointer',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};