import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, Stack, Select, Button } from '@chakra-ui/react';
import { supabase } from '../supabaseClient';

export default function AssignTab() {
  const [engineers, setEngineers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [userId, setUserId] = useState('');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: engs }, { data: projs }] = await Promise.all([
        supabase.from('users').select('id,email').eq('role', 'engineer'),
        supabase.from('projects').select('id,name').order('name', { ascending: true }),
      ]);
      setEngineers(engs || []);
      setProjects(projs || []);
    })();
  }, []);

  const assign = async () => {
    if (!userId || !projectId) return;
    await supabase.from('project_assignments').insert({ user_id: userId, project_id: projectId });
    setUserId('');
    setProjectId('');
  };

  return (
    <Stack spacing={4} w="100%">
      <Box>
        <Heading size="md">Assign Project</Heading>
        <Text color="gray.600">Assign an engineer to a project.</Text>
      </Box>

      <Stack spacing={3}>
        <Select
          placeholder="Select engineer"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          w="100%"
        >
          {engineers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
        </Select>

        <Select
          placeholder="Select project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          w="100%"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>

        <Button colorScheme="brand" onClick={assign}>
          👤 Assign
        </Button>
        <Text fontSize="sm" color="gray.500">You can reassign any time.</Text>
      </Stack>
    </Stack>
  );
}