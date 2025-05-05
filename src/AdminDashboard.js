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
    const newName = prompt('Edit project name:', name);
    if (newName && newName.trim()) {
      await supabase.from('projects').update({ name: newName }).eq('id', id);
      fetchAll();
    }
  };

  const deleteProject = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      await supabase.from('projects').delete().eq('id', id);
      fetchAll();
    }
  };

  const addTeam = async () => {
    if (!newTeam.trim()) return;
    await supabase.from('labour_teams').insert({ name: newTeam });
    setNewTeam('');
    fetchAll();
  };

  const updateTeam = async (id, name) => {
    const newName = prompt('Edit team name:', name);
    if (newName && newName.trim()) {
      await supabase.from('labour_teams').update({ name: newName }).eq('id', id);
      fetchAll();
    }
  };

  const deleteTeam = async (id) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      await supabase.from('labour_teams').delete().eq('id', id);
      fetchAll();
    }
  };

  const addType = async () => {
    const { team_id, type_name } = newType;
    if (!team_id || !type_name.trim()) return;
    await supabase.from('labour_types').insert(newType);
    setNewType({ team_id: '', type_name: '' });
    fetchAll();
  };

  const updateType = async (id, name) => {
    const newName = prompt('Edit labour type name:', name);
    if (newName && newName.trim()) {
      await supabase.from('labour_types').update({ type_name: newName }).eq('id', id);
      fetchAll();
    }
  };

  const deleteType = async (id) => {
    if (window.confirm('Are you sure you want to delete this labour type?')) {
      await supabase.from('labour_types').delete().eq('id', id);
      fetchAll();
    }
  };

  const assignProject = async () => {
    if (!assignedProjectId || !assignedUserId) return;
    await supabase.from('project_assignments').insert({ project_id: assignedProjectId, user_id: assignedUserId });
    setAssignedProjectId('');
    setAssignedUserId('');
  };

  return (
    <div style={{ padding: 20, maxWidth: '100vw', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2>Admin Dashboard</h2>
        <p>Logged in as: {user.email}</p>
        <button onClick={onLogout} style={{ marginBottom: 20 }}>Logout</button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {['projects', 'teams', 'types', 'assign', 'summary'].map((t) => (
            <button key={t} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === 'projects' && (
          <div>
            <h3>Projects</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="New Project Name"
                style={{ flex: '1 1 200px', minWidth: 0 }}
              />
              <button onClick={addProject}>Add</button>
            </div>
            <ul style={{ paddingLeft: 0, listStyleType: 'none' }}>
              {projects.map((p) => (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span>{p.name}</span>
                  <div>
                    <button onClick={() => updateProject(p.id, p.name)}>✏️</button>
                    <button onClick={() => deleteProject(p.id)}>🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'teams' && (
          <div>
            <h3>Labour Teams</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <input
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                placeholder="New Team Name"
                style={{ flex: '1 1 200px', minWidth: 0 }}
              />
              <button onClick={addTeam}>Add</button>
            </div>
            <ul style={{ paddingLeft: 0, listStyleType: 'none' }}>
              {teams.map((t) => (
                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span>{t.name}</span>
                  <div>
                    <button onClick={() => updateTeam(t.id, t.name)}>✏️</button>
                    <button onClick={() => deleteTeam(t.id)}>🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'types' && (
          <div>
            <h3>Labour Types</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
            </div>
            <ul style={{ paddingLeft: 0, listStyleType: 'none' }}>
              {types.map((t) => (
                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span>{t.type_name} (Team ID: {t.team_id})</span>
                  <div>
                    <button onClick={() => updateType(t.id, t.type_name)}>✏️</button>
                    <button onClick={() => deleteType(t.id)}>🗑️</button>
                  </div>
                </li>
              ))}
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
    </div>
  );
}