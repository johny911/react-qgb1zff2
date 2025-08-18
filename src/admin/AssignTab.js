// src/admin/AssignTab.js
import React, { useEffect, useState } from 'react';
import {
  Stack, Select, Button, Text,
} from '@chakra-ui/react';
import { FiUserCheck } from 'react-icons/fi';
import { supabase } from '../supabaseClient';
import { SectionCard } from '../components/ui/Kit';

export default function AssignTab() {
  const [projects, setProjects] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [assignedProjectId, setAssignedProjectId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');

  const fetchData = async () => {
    const [{ data: proj }, { data: engs }] = await Promise.all([
      supabase.from('projects').select('*').order('name', { ascending: true }),
      supabase.from('users').select('*').eq('role', 'engineer').order('email', { ascending: true }),
    ]);
    setProjects(proj || []);
    setEngineers(engs || []);
  };

  useEffect(() => { fetchData(); }, []);

  const assignProject = async () => {
    if (!assignedProjectId || !assignedUserId) return alert('Select an engineer and a project');
    await supabase
      .from('project_assignments')
      .insert({ project_id: assignedProjectId, user_id: assignedUserId });
    setAssignedProjectId('');
    setAssignedUserId('');
    alert('Assigned!');
  };

  return (
    <SectionCard title="Assign Project" subtitle="Assign an engineer to a project.">
      <Stack spacing={3}>
        <Select
          placeholder="Select engineer"
          value={assignedUserId}
          onChange={(e) => setAssignedUserId(e.target.value)}
        >
          {engineers.map((u) => (
            <option key={u.id} value={u.id}>{u.email}</option>
          ))}
        </Select>
        <Select
          placeholder="Select project"
          value={assignedProjectId}
          onChange={(e) => setAssignedProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <Button leftIcon={<FiUserCheck />} colorScheme="brand" onClick={assignProject}>
          Assign
        </Button>
        <Text fontSize="xs" color="gray.500">You can reassign any time.</Text>
      </Stack>
    </SectionCard>
  );
}