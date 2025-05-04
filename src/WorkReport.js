// src/WorkReport.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function WorkReport({ goHome }) {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [works, setWorks] = useState([
    {
      description: '',
      quantity: '',
      uom: '',
      labourAllotments: [{ teamId: '', typeId: '', count: '' }],
    },
  ]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remainingMap, setRemainingMap] = useState({});

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedProject && date) fetchAttendance();
  }, [selectedProject, date]);

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
      .eq('project_id', selectedProject)
      .eq('date', date);

    const attendance = {};
    data?.forEach((row) => {
      const key = `${row.team_id}-${row.labour_type_id}`;
      attendance[key] = (attendance[key] || 0) + row.count;
    });

    setAttendanceMap(attendance);
    setRemainingMap({ ...attendance });
  };

  const updateRemainingCounts = () => {
    const used = {};
    works.forEach((w) => {
      w.labourAllotments.forEach((a) => {
        const key = `${a.teamId}-${a.typeId}`;
        used[key] = (used[key] || 0) + parseInt(a.count || '0');
      });
    });
    const remaining = {};
    for (let key in attendanceMap) {
      remaining[key] = attendanceMap[key] - (used[key] || 0);
    }
    setRemainingMap(remaining);
  };

  const handleWorkChange = (index, field, value) => {
    const updated = [...works];
    updated[index][field] = value;
    setWorks(updated);
  };

  const handleAllotmentChange = (wIdx, aIdx, field, value) => {
    const updated = [...works];
    const allotment = updated[wIdx].labourAllotments[aIdx];
    allotment[field] = value;
    if (field === 'teamId') allotment.typeId = '';
    setWorks(updated);
    updateRemainingCounts();
  };

  const addWork = () => {
    setWorks([
      ...works,
      {
        description: '',
        quantity: '',
        uom: '',
        labourAllotments: [{ teamId: '', typeId: '', count: '' }],
      },
    ]);
  };

  const addAllotment = (index) => {
    const updated = [...works];
    updated[index].labourAllotments.push({ teamId: '', typeId: '', count: '' });
    setWorks(updated);
  };

  const canSubmit = () => {
    return Object.values(remainingMap).every((v) => v === 0);
  };

  const handleSubmit = async () => {
    console.log('Submit clicked');
    if (!canSubmit()) return alert('Please allot all labours before submitting.');

    const { data: reportInsert, error: reportError } = await supabase
      .from('work_reports')
      .insert({ date, project_id: selectedProject, description: `Work Report for ${date}` })
      .select()
      .single();

    if (reportError || !reportInsert) {
      console.error('Report insert error:', reportError);
      return alert('Error submitting report.');
    }

    for (const work of works) {
      const { data: workData, error: workError } = await supabase
        .from('work_allotments')
        .insert({
          report_id: reportInsert.id,
          work_description: work.description,
          quantity: work.quantity,
          uom: work.uom,
        })
        .select()
        .single();

      if (workError) {
        console.error('Work insert error:', workError);
        continue;
      }

      const labourRows = work.labourAllotments.map((a) => ({
        report_id: reportInsert.id,
        work_allotment_id: workData.id,
        team_id: a.teamId,
        labour_type_id: a.typeId,
        count: parseInt(a.count),
      }));

      const { error: labErr } = await supabase.from('work_report_labours').insert(labourRows);
      if (labErr) console.error('Labour insert error:', labErr);
    }

    alert('✅ Work report submitted!');
    goHome();
  };

  return (
    <div>
      <h3>Work Done Report</h3>
      <select style={input} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
        <option value=''>-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input type='date' style={input} value={date} onChange={(e) => setDate(e.target.value)} />

      {works.map((work, wIdx) => (
        <div key={wIdx} style={{ border: '1px solid #ccc', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <input placeholder='Work Description' style={input} value={work.description} onChange={(e) => handleWorkChange(wIdx, 'description', e.target.value)} />
          <input placeholder='Quantity' style={input} value={work.quantity} onChange={(e) => handleWorkChange(wIdx, 'quantity', e.target.value)} />
          <input placeholder='UOM' style={input} value={work.uom} onChange={(e) => handleWorkChange(wIdx, 'uom', e.target.value)} />
          <p><strong>Allotted Labours</strong></p>
          {work.labourAllotments.map((a, aIdx) => {
            const filteredTeams = teams.filter((t) => Object.keys(attendanceMap).some((key) => key.startsWith(`${t.id}-`)));
            const filteredTypes = types[a.teamId]?.filter((t) => attendanceMap[`${a.teamId}-${t.id}`]) || [];
            return (
              <div key={aIdx}>
                <select style={input} value={a.teamId} onChange={(e) => handleAllotmentChange(wIdx, aIdx, 'teamId', e.target.value)}>
                  <option value=''>Select Team</option>
                  {filteredTeams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select style={input} value={a.typeId} onChange={(e) => handleAllotmentChange(wIdx, aIdx, 'typeId', e.target.value)}>
                  <option value=''>Select Type</option>
                  {filteredTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.type_name}</option>
                  ))}
                </select>
                <input type='number' placeholder='Count' style={input} value={a.count} onChange={(e) => handleAllotmentChange(wIdx, aIdx, 'count', e.target.value)} />
                {a.teamId && a.typeId && (
                  <p style={{ color: 'red' }}>Remaining: {remainingMap[`${a.teamId}-${a.typeId}`] || 0} nos</p>
                )}
              </div>
            );
          })}
          <button style={secondaryBtn} onClick={() => addAllotment(wIdx)}>+ Add Labour</button>
        </div>
      ))}

      <button style={secondaryBtn} onClick={addWork}>+ Add Work</button>
      <button style={primaryBtn} onClick={handleSubmit} disabled={!canSubmit()}>✅ Submit Work Report</button>
      <button style={secondaryBtn} onClick={goHome}>← Back</button>
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