// src/WorkReport.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function WorkReport({ user, onLogout, goHome }) {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [uom, setUom] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [allotments, setAllotments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (projectId && date) fetchAttendance();
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

  async function fetchAttendance() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);

    if (!error && data) {
      setAttendance(data);
      const initialAllotments = data.map((entry) => ({
        team_id: entry.team_id,
        labour_type_id: entry.labour_type_id,
        count: entry.count,
        allotted: '',
      }));
      setAllotments(initialAllotments);
    }
  }

  const updateAllotted = (index, value) => {
    const updated = [...allotments];
    updated[index].allotted = value;
    setAllotments(updated);
  };

  const isReadyToSubmit = allotments.every((a) => a.allotted && parseInt(a.allotted) === a.count);

  const handleSubmit = async () => {
    if (!projectId || !date || !description || !quantity || !uom || !isReadyToSubmit) {
      alert('Please fill all fields and fully allot labour.');
      return;
    }

    const { error } = await supabase.from('work_reports').insert({
      project_id: projectId,
      date,
      description,
      quantity,
      uom,
      labour_allotments: allotments,
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Work Report Submitted!');
      setDescription('');
      setQuantity('');
      setUom('');
      setAllotments([]);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h3>Enter Work Done Report</h3>
        <select style={styles.input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">-- Select Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        <textarea placeholder="Work Description" style={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} />
        <input placeholder="Work Done Quantity" style={styles.input} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <input placeholder="Unit of Measurement (UOM)" style={styles.input} value={uom} onChange={(e) => setUom(e.target.value)} />

        <h4 style={{ marginTop: 20 }}>Allot Labour (match attendance)</h4>
        {allotments.map((a, i) => {
          const team = teams.find((t) => t.id === a.team_id)?.name || 'Team';
          const type = types[a.team_id]?.find((t) => t.id === a.labour_type_id)?.type_name || 'Type';
          return (
            <div key={i} style={styles.row}>
              <span>{team} – {type} – {a.count} nos</span>
              <input
                type="number"
                placeholder="Allotted"
                style={{ ...styles.input, marginTop: 6 }}
                value={a.allotted}
                onChange={(e) => updateAllotted(i, e.target.value)}
              />
            </div>
          );
        })}

        <button style={styles.primaryBtn} onClick={handleSubmit} disabled={!isReadyToSubmit}>
          ✅ Submit Work Report
        </button>
        <button style={styles.secondaryBtn} onClick={goHome}>← Back</button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    background: '#f4f6f8',
    padding: 20,
    minHeight: '100vh',
  },
  card: {
    background: '#fff',
    maxWidth: 480,
    margin: '0 auto',
    padding: 24,
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 12,
    borderRadius: 10,
    border: '1px solid #ccc',
    fontSize: 16,
    boxSizing: 'border-box',
  },
  row: {
    marginBottom: 12,
  },
  primaryBtn: {
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    padding: 12,
    width: '100%',
    borderRadius: 10,
    fontSize: 16,
    cursor: 'pointer',
    marginTop: 12,
  },
  secondaryBtn: {
    background: '#ccc',
    color: '#000',
    border: 'none',
    padding: 12,
    width: '100%',
    borderRadius: 10,
    fontSize: 16,
    cursor: 'pointer',
    marginTop: 8,
  },
};