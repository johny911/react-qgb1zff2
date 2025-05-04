// src/WorkReport.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function WorkReport({ onBack }) {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [works, setWorks] = useState([
    {
      description: '',
      quantity: '',
      uom: '',
      labourAllotments: [],
    },
  ]);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (projectId && date) loadAttendance();
  }, [projectId, date]);

  const fetchBaseData = async () => {
    const { data: projectData } = await supabase.from('projects').select('*');
    const { data: teamsData } = await supabase.from('labour_teams').select('*');
    const { data: typesData } = await supabase.from('labour_types').select('*');

    const typeMap = {};
    typesData.forEach((type) => {
      if (!typeMap[type.team_id]) typeMap[type.team_id] = [];
      typeMap[type.team_id].push(type);
    });

    setProjects(projectData || []);
    setTeams(teamsData || []);
    setTypes(typeMap);
  };

  const loadAttendance = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);

    setAttendanceData(data || []);
  };

  const handleWorkChange = (index, field, value) => {
    const updated = [...works];
    updated[index][field] = value;
    setWorks(updated);
  };

  const handleAllotmentChange = (workIndex, allotIndex, field, value) => {
    const updated = [...works];
    const allotments = [...updated[workIndex].labourAllotments];
    allotments[allotIndex][field] = value;
    updated[workIndex].labourAllotments = allotments;
    setWorks(updated);
  };

  const addWork = () => {
    setWorks([...works, { description: '', quantity: '', uom: '', labourAllotments: [] }]);
  };

  const addAllotment = (workIndex) => {
    const updated = [...works];
    updated[workIndex].labourAllotments.push({ teamId: '', typeId: '', count: '' });
    setWorks(updated);
  };

  const handleSubmit = async () => {
    for (const work of works) {
      const totalAllotted = work.labourAllotments.reduce((sum, r) => sum + Number(r.count || 0), 0);
      const totalAvailable = attendanceData.reduce((sum, r) => sum + r.count, 0);
      if (totalAllotted > totalAvailable) {
        alert('Over-allocation detected. Please fix.');
        return;
      }
    }

    const { data: insertedWorks, error } = await supabase
      .from('work_reports')
      .insert(
        works.map((w) => ({
          date,
          project_id: projectId,
          description: w.description,
          quantity: w.quantity,
          uom: w.uom,
        }))
      )
      .select();

    if (error || !insertedWorks) return alert('Error inserting work report');

    const allAllotments = [];
    insertedWorks.forEach((work, idx) => {
      works[idx].labourAllotments.forEach((r) => {
        allAllotments.push({
          report_id: work.id,
          team_id: r.teamId,
          labour_type_id: r.typeId,
          count: Number(r.count),
        });
      });
    });

    const { error: allotError } = await supabase.from('work_allotments').insert(allAllotments);
    if (allotError) return alert('Error saving allotments');

    alert('Work Report Saved!');
    onBack();
  };

  return (
    <div>
      <h3>Work Done Report</h3>
      <select style={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />

      {works.map((work, wi) => (
        <div key={wi} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 16, borderRadius: 8 }}>
          <input
            style={input}
            placeholder="Work Description"
            value={work.description}
            onChange={(e) => handleWorkChange(wi, 'description', e.target.value)}
          />
          <input
            style={input}
            placeholder="Quantity"
            value={work.quantity}
            onChange={(e) => handleWorkChange(wi, 'quantity', e.target.value)}
          />
          <input
            style={input}
            placeholder="UOM"
            value={work.uom}
            onChange={(e) => handleWorkChange(wi, 'uom', e.target.value)}
          />

          <h5>Allotted Labours</h5>
          {work.labourAllotments.map((r, ri) => (
            <div key={ri} style={{ marginBottom: 8 }}>
              <select style={input} value={r.teamId} onChange={(e) => handleAllotmentChange(wi, ri, 'teamId', e.target.value)}>
                <option value="">Select Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <select style={input} value={r.typeId} onChange={(e) => handleAllotmentChange(wi, ri, 'typeId', e.target.value)}>
                <option value="">Select Type</option>
                {(types[r.teamId] || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.type_name}</option>
                ))}
              </select>
              <input
                style={input}
                placeholder="Count"
                value={r.count}
                onChange={(e) => handleAllotmentChange(wi, ri, 'count', e.target.value)}
              />
            </div>
          ))}

          <button onClick={() => addAllotment(wi)} style={secondaryBtn}>+ Add Labour</button>
        </div>
      ))}

      <button onClick={addWork} style={secondaryBtn}>➕ Add Work</button>
      <button onClick={handleSubmit} style={primaryBtn}>✅ Submit Work Report</button>
      <button onClick={onBack} style={secondaryBtn}>← Back</button>
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
};

const primaryBtn = {
  background: '#3b6ef6',
  color: '#fff',
  padding: 12,
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
  padding: 10,
  borderRadius: 10,
  border: 'none',
  width: '100%',
  fontSize: 16,
  marginBottom: 12,
  cursor: 'pointer',
};
