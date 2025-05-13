// src/WorkReport.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function WorkReport({ onBack }) {
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
    (async () => {
      const { data: projectsData } = await supabase.from('projects').select('*');
      const { data: teamsData } = await supabase.from('labour_teams').select('*');
      const { data: typesData } = await supabase.from('labour_types').select('*');
      const typeMap = {};
      typesData.forEach((t) => {
        typeMap[t.team_id] = typeMap[t.team_id] || [];
        typeMap[t.team_id].push(t);
      });
      setProjects(projectsData || []);
      setTeams(teamsData || []);
      setTypes(typeMap);
    })();
  }, []);

  useEffect(() => {
    if (!selectedProject || !date) return;
    (async () => {
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
    })();
  }, [selectedProject, date]);

  const updateRemainingCounts = () => {
    const used = {};
    works.forEach((w) =>
      w.labourAllotments.forEach((a) => {
        const key = `${a.teamId}-${a.typeId}`;
        used[key] = (used[key] || 0) + parseInt(a.count || '0', 10);
      })
    );
    const rem = {};
    Object.keys(attendanceMap).forEach((key) => {
      rem[key] = attendanceMap[key] - (used[key] || 0);
    });
    setRemainingMap(rem);
  };

  const handleWorkChange = (wIdx, field, value) => {
    const list = [...works];
    list[wIdx][field] = value;
    setWorks(list);
  };
  const handleAllotmentChange = (wIdx, aIdx, field, value) => {
    const list = [...works];
    const all = list[wIdx].labourAllotments[aIdx];
    all[field] = value;
    if (field === 'teamId') all.typeId = '';
    setWorks(list);
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
  const addAllotment = (wIdx) => {
    const list = [...works];
    list[wIdx].labourAllotments.push({ teamId: '', typeId: '', count: '' });
    setWorks(list);
  };
  const canSubmit = () => Object.values(remainingMap).every((v) => v === 0);

  const handleSubmit = async () => {
    if (!canSubmit()) return alert('Please allot all labours before submitting.');
    const { data: report, error: reportErr } = await supabase
      .from('work_reports')
      .insert({
        project_id: selectedProject,
        date,
        description: `Work Report for ${date}`,
      })
      .select()
      .single();
    if (reportErr || !report) return alert('Error submitting report.');
    for (let work of works) {
      const { data: wa, error: waErr } = await supabase
        .from('work_allotments')
        .insert({
          report_id: report.id,
          work_description: work.description,
          quantity: work.quantity,
          uom: work.uom,
        })
        .select()
        .single();
      if (waErr || !wa) continue;
      const labourRows = work.labourAllotments.map((a) => ({
        work_allotment_id: wa.id,
        team_id: a.teamId,
        labour_type_id: a.typeId,
        count: parseInt(a.count, 10),
      }));
      await supabase.from('work_report_labours').insert(labourRows);
    }
    alert('✅ Work report submitted!');
    onBack();
  };

  // styles for full‐width buttons container
  const btnContainer = { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' };
  const fullBtn = { width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer' };

  return (
    <div>
      <h3>Work Done Report</h3>
      <select style={{ ...fullBtn, marginBottom: 12 }} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
        <option value=''>-- Select Project --</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input type='date' style={{ ...fullBtn, marginBottom: 12 }} value={date} onChange={(e) => setDate(e.target.value)} />

      {works.map((work, wIdx) => (
        <div key={wIdx} style={{ border: '1px solid #ccc', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <input
            placeholder='Work Description'
            style={{ ...fullBtn, marginBottom: 8 }}
            value={work.description}
            onChange={(e) => handleWorkChange(wIdx, 'description', e.target.value)}
          />
          <input
            placeholder='Quantity'
            style={{ ...fullBtn, marginBottom: 8 }}
            value={work.quantity}
            onChange={(e) => handleWorkChange(wIdx, 'quantity', e.target.value)}
          />
          <input
            placeholder='UOM'
            style={{ ...fullBtn, marginBottom: 8 }}
            value={work.uom}
            onChange={(e) => handleWorkChange(wIdx, 'uom', e.target.value)}
          />

          <p><strong>Allotted Labours</strong></p>
          {work.labourAllotments.map((a, aIdx) => {
            const availableTeams = teams.filter((t) =>
              Object.keys(attendanceMap).some((k) => k.startsWith(`${t.id}-`))
            );
            const availableTypes = (types[a.teamId] || []).filter((t) =>
              attendanceMap[`${a.teamId}-${t.id}`] > 0
            );
            return (
              <div key={aIdx} style={{ marginBottom: 8 }}>
                <select
                  style={{ ...fullBtn, marginBottom: 6 }}
                  value={a.teamId}
                  onChange={(e) => handleAllotmentChange(wIdx, aIdx, 'teamId', e.target.value)}
                >
                  <option value=''>Select Team</option>
                  {availableTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select
                  style={{ ...fullBtn, marginBottom: 6 }}
                  value={a.typeId}
                  onChange={(e) => handleAllotmentChange(wIdx, aIdx, 'typeId', e.target.value)}
                >
                  <option value=''>Select Type</option>
                  {availableTypes.map((t) => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                <input
                  type='number'
                  placeholder='Count'
                  style={{ ...fullBtn, marginBottom: 6 }}
                  value={a.count}
                  onChange={(e) => handleAllotmentChange(wIdx, aIdx, 'count', e.target.value)}
                />
                {a.teamId && a.typeId && (
                  <p style={{ color: 'red', margin: 0 }}>
                    Remaining: {remainingMap[`${a.teamId}-${a.typeId}`] || 0} nos
                  </p>
                )}
              </div>
            );
          })}
          <button style={{ ...fullBtn, background: '#eee' }} onClick={() => addAllotment(wIdx)}>
            + Add Labour
          </button>
        </div>
      ))}

      {/* BUTTONS STACKED FULL‐WIDTH */}
      <div style={btnContainer}>
        <button style={{ ...fullBtn, background: '#eee' }} onClick={addWork}>
          + Add Work
        </button>
        <button
          style={{ ...fullBtn, background: '#3b6ef6', color: '#fff' }}
          disabled={!canSubmit()}
          onClick={handleSubmit}
        >
          ✅ Submit Work Report
        </button>
        <button style={{ ...fullBtn, background: '#eee' }} onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}