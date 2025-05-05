// src/AdminDashboard.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [assignedProjectId, setAssignedProjectId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [newType, setNewType] = useState({ team_id: '', type_name: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: proj } = await supabase.from('projects').select('*');
    const { data: team } = await supabase.from('labour_teams').select('*');
    const { data: type } = await supabase.from('labour_types').select('*');
    const { data: engs } = await supabase.from('users').select('*').eq('role', 'engineer');

    setProjects(proj || []);
    setTeams(team || []);
    setTypes(type || []);
    setEngineers(engs || []);
  };

  const addProject = async () => {
    if (!newProject.trim()) return;
    await supabase.from('projects').insert({ name: newProject });
    setNewProject('');
    fetchAll();
  };

  const updateProject = async (id, name) => {
    if (!name.trim()) return;
    await supabase.from('projects').update({ name }).eq('id', id);
    fetchAll();
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    await supabase.from('projects').delete().eq('id', id);
    fetchAll();
  };

  const addTeam = async () => {
    if (!newTeam.trim()) return;
    await supabase.from('labour_teams').insert({ name: newTeam });
    setNewTeam('');
    fetchAll();
  };

  const addType = async () => {
    const { team_id, type_name } = newType;
    if (!team_id || !type_name.trim()) return;
    await supabase.from('labour_types').insert(newType);
    setNewType({ team_id: '', type_name: '' });
    fetchAll();
  };

  const assignProject = async () => {
    if (!assignedProjectId || !assignedUserId) return;
    await supabase.from('project_assignments').insert({ project_id: assignedProjectId, user_id: assignedUserId });
    setAssignedProjectId('');
    setAssignedUserId('');
  };

  return (
    <div style={wrapper}>
      <div style={container}>
        <h2>Admin Dashboard</h2>
        <p>Logged in as: {user.email}</p>
        <button onClick={onLogout} style={btnSecondary}>Logout</button>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['projects', 'teams', 'types', 'assign', 'summary'].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={btnTab}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === 'projects' && (
          <div>
            <h3>Projects</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="New Project Name"
                style={input}
              />
              <button onClick={addProject} style={btnPrimary}>Add</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {projects.map((p) => (
                <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input
                    value={p.name}
                    onChange={(e) => setProjects(projects.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))}
                    style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                  />
                  <button onClick={() => updateProject(p.id, p.name)} style={btnPrimary}>✏️</button>
                  <button onClick={() => deleteProject(p.id)} style={btnDanger}>🗑️</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'teams' && (
          <div>
            <h3>Labour Teams</h3>
            <input
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              placeholder="New Team Name"
              style={input}
            />
            <button onClick={addTeam} style={btnPrimary}>Add</button>
            <ul>
              {teams.map((t) => <li key={t.id}>{t.name}</li>)}
            </ul>
          </div>
        )}

        {tab === 'types' && (
          <div>
            <h3>Labour Types</h3>
            <select
              value={newType.team_id}
              onChange={(e) => setNewType({ ...newType, team_id: e.target.value })}
              style={input}
            >
              <option value=''>Select Team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input
              value={newType.type_name}
              onChange={(e) => setNewType({ ...newType, type_name: e.target.value })}
              placeholder="New Labour Type"
              style={input}
            />
            <button onClick={addType} style={btnPrimary}>Add</button>
            <ul>
              {types.map((t) => <li key={t.id}>{t.type_name} (Team ID: {t.team_id})</li>)}
            </ul>
          </div>
        )}

        {tab === 'assign' && (
          <div>
            <h3>Assign Project to Engineer</h3>
            <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} style={input}>
              <option value=''>Select Engineer</option>
              {engineers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
            <select value={assignedProjectId} onChange={(e) => setAssignedProjectId(e.target.value)} style={input}>
              <option value=''>Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={assignProject} style={btnPrimary}>Assign</button>
          </div>
        )}

        {tab === 'summary' && (
          <div>
            <h3>Attendance Summary (coming soon)</h3>
          </div>
        )}
      </div>
    </div>
  );
}

const wrapper = { fontFamily: 'system-ui, sans-serif', background: '#f4f6f8', minHeight: '100vh', padding: 20 };
const container = { background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' };
const input = { padding: 10, fontSize: 16, borderRadius: 8, border: '1px solid #ccc', flex: 1 };
const btnPrimary = { background: '#1976d2', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer' };
const btnSecondary = { background: '#666', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer' };
const btnDanger = { background: '#d32f2f', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer' };
const btnTab = { ...btnSecondary, fontWeight: 'bold', textTransform: 'uppercase' };