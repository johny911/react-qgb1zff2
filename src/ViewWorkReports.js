// src/ViewWorkReports.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function ViewWorkReports({ onBack }) {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchTeamsAndTypes();
  }, []);

  // 1. load projects for the dropdown
  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*');
    if (!error) setProjects(data || []);
  };

  // 2. load teams + types so we can map IDs → names
  const fetchTeamsAndTypes = async () => {
    const { data: teamsData } = await supabase
      .from('labour_teams')
      .select('id, name');
    const { data: typesData } = await supabase
      .from('labour_types')
      .select('id, team_id, type_name');

    const typeMap = {};
    (typesData || []).forEach((t) => {
      if (!typeMap[t.team_id]) typeMap[t.team_id] = [];
      typeMap[t.team_id].push(t);
    });

    setTeams(teamsData || []);
    setTypes(typeMap);
  };

  // 3. fetch the work items (with JSONB labour_allotments) for that report
  const fetchReports = async () => {
    if (!selectedProject || !date) {
      return alert('Please select a project and date');
    }
    setLoading(true);
    setWorks([]);

    // find the report header
    const { data: headers, error: hErr } = await supabase
      .from('work_reports')
      .select('id')
      .eq('project_id', selectedProject)
      .eq('date', date)
      .limit(1);

    if (hErr || !headers || headers.length === 0) {
      setLoading(false);
      return alert('No work report found for that date/project');
    }
    const reportId = headers[0].id;

    // now grab all the work_allotments rows for that report
    const { data: workData, error: wErr } = await supabase
      .from('work_allotments')
      .select('id, work_description, quantity, uom, labour_allotments')
      .eq('report_id', reportId);

    if (wErr) {
      console.error(wErr);
      alert('Error loading report');
      setLoading(false);
      return;
    }

    setWorks(workData || []);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
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

      {works.map((w, i) => (
        <div
          key={i}
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            marginTop: 12,
          }}
        >
          <p>
            <strong>Work:</strong> {w.work_description}
          </p>
          <p>
            <strong>Qty:</strong> {w.quantity} {w.uom}
          </p>
          <p>
            <strong>Labours:</strong>
          </p>
          {Array.isArray(w.labour_allotments) &&
          w.labour_allotments.length > 0 ? (
            <ul>
              {w.labour_allotments.map((a, idx) => (
                <li key={idx}>
                  {teams.find((t) => t.id === a.teamId)?.name ||
                    'Unknown Team'}{' '}
                  –{' '}
                  {types[a.teamId]?.find((t) => t.id === a.typeId)
                    ?.type_name || 'Unknown Type'}{' '}
                  – {a.count} nos
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#666' }}>No labours recorded</p>
          )}
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
  borderRadius: 8,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
};

const primaryBtn = {
  background: '#3b6ef6',
  color: 'white',
  padding: '12px 0',
  border: 'none',
  borderRadius: 8,
  width: '100%',
  fontSize: 16,
  cursor: 'pointer',
};

const secondaryBtn = {
  background: '#eee',
  color: '#333',
  padding: '12px 0',
  border: 'none',
  borderRadius: 8,
  width: '100%',
  fontSize: 16,
  cursor: 'pointer',
};