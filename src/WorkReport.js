// src/WorkReport.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function WorkReport({ projectId, date }) {
  const [projects, setProjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [uom, setUom] = useState('');
  const [labourAllotments, setLabourAllotments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchAttendanceData();
  }, [projectId, date]);

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*');
    setProjects(data || []);
  };

  const fetchAttendanceData = async () => {
    if (!projectId || !date) return;

    const { data } = await supabase
      .from('attendance')
      .select('id, team_id, labour_type_id, count')
      .eq('project_id', projectId)
      .eq('date', date);

    setAttendance(data || []);
    const mapped = (data || []).map((entry) => ({
      team_id: entry.team_id,
      labour_type_id: entry.labour_type_id,
      total: entry.count,
      allotted: '',
    }));
    setLabourAllotments(mapped);
  };

  const handleAllotmentChange = (index, value) => {
    const updated = [...labourAllotments];
    updated[index].allotted = value;
    setLabourAllotments(updated);
  };

  const allLaboursAllotted = () => {
    return labourAllotments.every((entry) => parseInt(entry.allotted || 0) === entry.total);
  };

  const handleSubmit = async () => {
    if (!description || !quantity || !uom || !allLaboursAllotted()) {
      alert('Please fill all fields and fully allot labours');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('work_reports').insert({
      project_id: projectId,
      date,
      description,
      quantity,
      uom,
      labour_allotments: labourAllotments,
    });

    if (error) {
      alert('Submission failed');
    } else {
      alert('Report submitted successfully');
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return <p>✅ Work report submitted!</p>;
  }

  return (
    <div>
      <h3>📋 Work Done Report</h3>
      <p><strong>Project:</strong> {projects.find(p => p.id === projectId)?.name || 'N/A'}</p>
      <p><strong>Date:</strong> {date}</p>

      <textarea
        placeholder="Work Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        style={input}
      />
      <input
        type="text"
        placeholder="Quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        style={input}
      />
      <input
        type="text"
        placeholder="Unit of Measurement (UOM)"
        value={uom}
        onChange={(e) => setUom(e.target.value)}
        style={input}
      />

      <h4>Allot Labour</h4>
      {labourAllotments.map((entry, index) => (
        <div key={index} style={{ ...input, padding: 10 }}>
          Team ID: {entry.team_id}, Type ID: {entry.labour_type_id}, Total: {entry.total}
          <input
            type="number"
            placeholder="Allotted"
            value={entry.allotted}
            onChange={(e) => handleAllotmentChange(index, e.target.value)}
            style={{ marginTop: 8, width: '100%', padding: 8 }}
          />
        </div>
      ))}

      <button onClick={handleSubmit} disabled={loading} style={primaryBtn}>
        ✅ Submit Report
      </button>
    </div>
  );
}

const input = {
  width: '100%',
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
  fontSize: 16,
};

const primaryBtn = {
  background: '#1976d2',
  color: '#fff',
  padding: 14,
  borderRadius: 10,
  border: 'none',
  width: '100%',
  fontSize: 16,
  marginBottom: 12,
  cursor: 'pointer',
};