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
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h2>Admin Dashboard</h2>
      <p>Logged in as: {user.email}</p>
      <button onClick={onLogout} style={{ marginBottom: 20 }}>Logout</button>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['projects', 'teams', 'types', 'assign', 'summary'].map((t) => (
          <button key={t} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab === 'projects' && (
        <div>
          <h3>Projects</h3>
          <input
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            placeholder="New Project Name"
          />
          <button onClick={addProject}>Add</button>
          <ul>
            {projects.map((p) => <li key={p.id}>{p.name}</li>)}
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
          />
          <button onClick={addTeam}>Add</button>
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
          >
            <option value=''>Select Team</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input
            value={newType.type_name}
            onChange={(e) => setNewType({ ...newType, type_name: e.target.value })}
            placeholder="New Labour Type"
          />
          <button onClick={addType}>Add</button>
          <ul>
            {types.map((t) => <li key={t.id}>{t.type_name} (Team ID: {t.team_id})</li>)}
          </ul>
        </div>
      )}

      {tab === 'assign' && (
        <div>
          <h3>Assign Project to Engineer</h3>
          <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
            <option value=''>Select Engineer</option>
            {engineers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
          <select value={assignedProjectId} onChange={(e) => setAssignedProjectId(e.target.value)}>
            <option value=''>Select Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={assignProject}>Assign</button>
        </div>
      )}

      {tab === 'summary' && (
        <div>
          <h3>Attendance Summary (coming soon)</h3>
        </div>
      )}
    </div>
  );
}
