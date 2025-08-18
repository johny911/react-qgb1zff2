// src/admin/ProjectsTab.js
import React, { useEffect, useState } from 'react';
import {
  Stack, HStack, Input, Button, IconButton, Text, Divider, Box,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiSave, FiX } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

export default function ProjectsTab() {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState('');

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('projects').select('*').order('name', { ascending: true });
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const addProject = async () => {
    if (!newProject.trim()) return;
    await supabase.from('projects').insert({ name: newProject.trim() });
    setNewProject('');
    fetchProjects();
  };

  const startEdit = (p) => { setEditId(p.id); setEditName(p.name); };
  const cancelEdit = () => { setEditId(null); setEditName(''); };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    await supabase.from('projects').update({ name: editName.trim() }).eq('id', editId);
    cancelEdit();
    fetchProjects();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    await supabase.from('projects').delete().eq('id', id);
    fetchProjects();
  };

  return (
    <Stack spacing={4}>
      <HStack>
        <Input
          placeholder="New project name"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
        />
        <Button leftIcon={<FiPlus />} onClick={addProject} colorScheme="brand">
          Add
        </Button>
        <IconButton aria-label="Refresh" icon={<FiRefreshCw />} onClick={fetchProjects} variant="ghost" />
      </HStack>

      <Divider />

      <Stack spacing={3}>
        {loading && <Text fontSize="sm" color="gray.500">Loading…</Text>}
        {!loading && projects.length === 0 && (
          <Text fontSize="sm" color="gray.500">No projects yet.</Text>
        )}

        {projects.map((p) => (
          <HStack
            key={p.id}
            justify="space-between"
            p={3}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="lg"
            bg="gray.50"
          >
            {editId === p.id ? (
              <HStack w="100%">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                <IconButton aria-label="Save" icon={<FiSave />} onClick={saveEdit} colorScheme="brand" />
                <IconButton aria-label="Cancel" icon={<FiX />} onClick={cancelEdit} />
              </HStack>
            ) : (
              <>
                <Box flex="1"><Text>{p.name}</Text></Box>
                <HStack>
                  <IconButton aria-label="Edit" icon={<FiEdit2 />} onClick={() => startEdit(p)} />
                  <IconButton aria-label="Delete" icon={<FiTrash2 />} colorScheme="red" variant="outline" onClick={() => del(p.id)} />
                </HStack>
              </>
            )}
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}