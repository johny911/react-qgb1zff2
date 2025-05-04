// src/ViewWorkReports.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function ViewWorkReports({ onBack }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*');
    if (!error) setProjects(data || []);
  };

  const fetchReports = async () => {
    if (!selectedProject || !date) return alert('Select project and date');
    setLoading(true);
    setReports([]);

    const { data: reportHeaders, error: headerError } = await supabase
      .from('work_reports')
      .select('id')
      .eq('project_id', selectedProject)
      .eq('date', date);

    if (headerError || !reportHeaders || reportHeaders.length === 0) {
      setLoading(false);
      return alert('No reports found.');
    }

    const reportId = reportHeaders[0].id;

    const { data: workData, error: workError } = await supabase
      .from('work_allotments')
      .select(`
        id,
        work_description,
        quantity,
        uom,
        work_report_labours (
          count,
          labour_types (type_name),
          labour_teams (name)
        )
      `)
      .eq('report_id', reportId);

    if (workError) {
      console.error('Fetch error:', workError.message);
      alert('Error loading report.');
      setLoading(false);
      return;
    }

    setReports(workData || []);
    setLoading(false);
  };

  return (
    <div>
      <h3>View Work Done Report</h3>
      <select style={input} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
        <option value="">-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
      <button style={primaryBtn} onClick={fetchReports} disabled={loading}>
        {loading ? 'Loading...' : '🔍 View Report'}
      </button>

      {reports.map((w, i) => (
        <div key={i} style={{ border: '1px solid #ccc', marginTop: 12, borderRadius: 8, padding: 12 }}>
          <p><strong>Work:</strong> {w.work_description}</p>
          <p><strong>Qty:</strong> {w.quantity} {w.uom}</p>
          <p><strong>Labours:</strong></p>
          {w.work_report_labours?.length > 0 ? (
            <ul>
              {w.work_report_labours.map((l, idx) => (
                <li key={idx}>
                  {l.labour_teams?.name || 'Unknown Team'} – {l.labour_types?.type_name || 'Unknown Type'} – {l.count} nos
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'gray' }}>No labours recorded for this work</p>
          )}
        </div>
      ))}

      <button style={secondaryBtn} onClick={onBack}>← Back</button>
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