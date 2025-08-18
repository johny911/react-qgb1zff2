import React, { useEffect, useState } from 'react';
import {
  Box, HStack, Input, IconButton, Button, Stack, Text
} from '@chakra-ui/react';
import { FiPlus, FiRefreshCcw, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

export default function ProjectsTab() {
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState('');
  const refresh = async () => {
    const { data } = await supabase.from('projects').select('*').order('name', { ascending: true });
    setProjects(data || []);
  };
  useEffect(() => { refresh(); }, []);

  const addProject = async () => {
    if (!newProject.trim()) return;
    await supabase.from('projects').insert({ name: newProject.trim() });
    setNewProject('');
    refresh();
  };
  const editProject = async (p) => {
    const name = prompt('Edit project name:', p.name);
    if (name && name.trim()) {
      await supabase.from('projects').update({ name: name.trim() }).eq('id', p.id);
      refresh();
    }
  };
  const deleteProject = async (p) => {
    if (confirm('Delete this project?')) {
      await supabase.from('projects').delete().eq('id', p.id);
      refresh();
    }
  };

  return (
    <Stack spacing={4} w="100%">
      <HStack w="100%" spacing={3} align="stretch">
        <Input
          placeholder="New project name"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          flex="1"
          minW={0}
        />
        <Button onClick={addProject} leftIcon={<FiPlus />} flexShrink={0}>Add</Button>
        <IconButton aria-label="Refresh" icon={<FiRefreshCcw />} onClick={refresh} variant="outline" flexShrink={0} />
      </HStack>

      <Stack spacing={3}>
        {projects.map((p) => (
          <HStack
            key={p.id}
            w="100%"
            p={3}
            bg="gray.50"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="lg"
            spacing={3}
            align="center"
          >
            <Text flex="1" minW={0} noOfLines={2} fontWeight="semibold">
              {p.name}
            </Text>
            <HStack spacing={2} flexShrink={0}>
              <IconButton aria-label="Edit" icon={<FiEdit2 />} onClick={() => editProject(p)} />
              <IconButton aria-label="Delete" icon={<FiTrash2 />} onClick={() => deleteProject(p)} />
            </HStack>
          </HStack>
        ))}
        {projects.length === 0 && (
          <Box color="gray.500" fontSize="sm">No projects yet.</Box>
        )}
      </Stack>
    </Stack>
  );
}