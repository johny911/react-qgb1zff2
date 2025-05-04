// src/WorkReport.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function WorkReport({ onBack }) {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState([]);
  const [workItems, setWorkItems] = useState([
    { description: '', quantity: '', uom: '', allotments: [] }
  ]);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (projectId && date) fetchAttendance();
  }, [projectId, date]);

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

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);

    setAttendance(data || []);
  };

  const getAvailableLabours = (teamId, typeId) => {
    const total = attendance.find(
      (a) => a.team_id === parseInt(teamId) && a.labour_type_id === parseInt(typeId)
    )?.count || 0;

    const used = workItems.reduce((acc, w) => {
      return (
        acc +
        w.allotments.reduce((sum, a) => {
          if (a.teamId === teamId && a.typeId === typeId) {
            return sum + parseInt(a.count || '0');
          }
          return sum;
        }, 0)
      );
    }, 0);

    return { total, used, remaining: total - used };
  };

  const addWorkItem = () => {
    setWorkItems([...workItems, { description: '', quantity: '', uom: '', allotments: [] }]);
  };

  const updateWorkItem = (index, field, value) => {
    const updated = [...workItems];
    updated[index][field] = value;
    setWorkItems(updated);
  };

  const updateAllotment = (workIndex, allotIndex, field, value) => {
    const updated = [...workItems];
    updated[workIndex].allotments[allotIndex][field] = value;
    setWorkItems(updated);
  };

  const addAllotment = (workIndex) => {
    const updated = [...workItems];
    updated[workIndex].allotments.push({ teamId: '', typeId: '', count: '' });
    setWorkItems(updated);
  };

  const canSubmit = () => {
    const totalAttendance = attendance.reduce((sum, a) => sum + a.count, 0);
    const totalAllotted = workItems.reduce((acc, w) => {
      return acc + w.allotments.reduce((sum, a) => sum + parseInt(a.count || '0'), 0);
    }, 0);
    return totalAllotted === totalAttendance;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return alert('All labours must be allotted before submitting');
    const { error, data } = await supabase
      .from('work_reports')
      .insert({ project_id: projectId, date });

    if (error) return alert('Error creating report');

    const reportId = data[0].id;
    for (const work of workItems) {
      const { data: workData, error: workError } = await supabase
        .from('work_allotments')
        .insert({
          report_id: reportId,
          work_description: work.description,
          quantity: work.quantity,
          uom: work.uom
        })
        .select();

      const allotments = work.allotments.map((a) => ({
        report_id: reportId,
        work_description: work.description,
        team_id: a.teamId,
        labour_type_id: a.typeId,
        count: parseInt(a.count)
      }));
      await supabase.from('work_report_labours').insert(allotments);
    }
    alert('Report submitted!');
    onBack();
  };

  return (
    <div>
      <h3>Work Done Report</h3>
      <select style={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value=''>-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input type='date' style={input} value={date} onChange={(e) => setDate(e.target.value)} />

      {workItems.map((work, wIndex) => (
        <div key={wIndex} style={{ border: '1px solid #ccc', padding: 12, borderRadius: 10, marginBottom: 20 }}>
          <input
            style={input}
            placeholder='Work Description'
            value={work.description}
            onChange={(e) => updateWorkItem(wIndex, 'description', e.target.value)}
          />
          <input
            style={input}
            placeholder='Quantity'
            value={work.quantity}
            onChange={(e) => updateWorkItem(wIndex, 'quantity', e.target.value)}
          />
          <input
            style={input}
            placeholder='UOM'
            value={work.uom}
            onChange={(e) => updateWorkItem(wIndex, 'uom', e.target.value)}
          />

          <h4>Allotted Labours</h4>
          {work.allotments.map((a, i) => {
            const rem = getAvailableLabours(a.teamId, a.typeId);
            return (
              <div key={i} style={{ borderTop: '1px dashed #ccc', paddingTop: 8, marginBottom: 12 }}>
                <p style={{ color: 'red', fontWeight: 'bold' }}>
                  Remaining: {rem.used}/{rem.total} labours
                </p>
                <select style={input} value={a.teamId} onChange={(e) => updateAllotment(wIndex, i, 'teamId', e.target.value)}>
                  <option value=''>Select Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select style={input} value={a.typeId} onChange={(e) => updateAllotment(wIndex, i, 'typeId', e.target.value)}>
                  <option value=''>Select Type</option>
                  {(types[a.teamId] || []).map((t) => (
                    <option key={t.id} value={t.id}>{t.type_name}</option>
                  ))}
                </select>
                <input
                  style={input}
                  placeholder='No. of Labours'
                  value={a.count}
                  onChange={(e) => updateAllotment(wIndex, i, 'count', e.target.value)}
                />
              </div>
            );
          })}
          <button style={secondaryBtn} onClick={() => addAllotment(wIndex)}>+ Add Allotment</button>
        </div>
      ))}

      <button style={secondaryBtn} onClick={addWorkItem}>+ Add Work</button>
      <button style={primaryBtn} onClick={handleSubmit} disabled={!canSubmit()}>
        ✅ Submit Report
      </button>
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
