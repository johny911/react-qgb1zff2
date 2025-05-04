// src/ViewWorkReports.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function ViewWorkReports({ onBack }) {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [typesMap, setTypesMap] = useState({});
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1) fetch projects, teams, and labour‐types upfront
  useEffect(() => {
    const fetchBase = async () => {
      const [{ data: proj }, { data: tm }, { data: tp }] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('labour_teams').select('*'),
        supabase.from('labour_types').select('*'),
      ]);

      setProjects(proj || []);
      setTeams(tm || []);

      // build a map: typesMap[team_id] = [ {id,type_name}, … ]
      const map = {};
      (tp || []).forEach((t) => {
        map[t.team_id] = map[t.team_id] || [];
        map[t.team_id].push(t);
      });
      setTypesMap(map);
    };
    fetchBase();
  }, []);

  // 2) fetch the work_reports rows for this project + date
  const fetchReports = async () => {
    if (!selectedProject || !date) {
      alert('Select project and date');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('work_reports')
      .select('description, quantity, uom, labour_allotments')
      .eq('project_id', selectedProject)
      .eq('date', date);

    if (error) {
      console.error('Error loading reports:', error);
      alert('Error loading report.');
    } else {
      if (!data.length) alert('No reports found.');
      setReports(data);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 460, margin: '0 auto' }}>
      <h3>View Work Done Report</h3>
      <select
        style={input}
        value={selectedProject}
        onChange={(e) => setSelectedProject(e.target.value)}
      >
        <option value="">-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        style={input}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <button style={primaryBtn} onClick={fetchReports} disabled={loading}>
        {loading ? 'Loading…' : '🔍 View Report'}
      </button>

      {reports.map((w, i) => (
        <div
          key={i}
          style={{
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: 12,
            marginTop: 12,
          }}
        >
          <p>
            <strong>Work:</strong> {w.description}
          </p>
          <p>
            <strong>Qty:</strong> {w.quantity} {w.uom}
          </p>
          <p>
            <strong>Labours:</strong>
          </p>
          <ul style={{ marginLeft: 16 }}>
            {w.labour_allotments.map((a, idx) => {
              const team = teams.find((t) => t.id === a.teamId);
              const labTypes = typesMap[a.teamId] || [];
              const type = labTypes.find((t) => t.id === a.typeId);
              return (
                <li key={idx}>
                  {team?.name || 'Unknown Team'} –{' '}
                  {type?.type_name || 'Unknown Type'} – {a.count} nos
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <button style={secondaryBtn} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

const input = {
  width: '100%',
  padding: 12,
  marginBottom: 12,
  fontSize: 16,
  borderRadius: 10,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
};

const primaryBtn = {
  background: '#3b6ef6',
  color: '#fff',
  padding: 14,
  borderRadius: 10,
  border: 'none',
  width: '100%',
  fontSize: 16,
  marginBottom: 12,
  cursor: 'pointer',
};

const secondaryBtn = {
  background: '#eee',
  color: '#333',
  padding: 12,
  borderRadius: 10,
  border: 'none',
  width: '100%',
  fontSize: 16,
  marginBottom: 12,
  cursor: 'pointer',
};