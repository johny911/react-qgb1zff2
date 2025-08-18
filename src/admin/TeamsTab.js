// src/admin/TeamsTab.js
import React, { useEffect, useState } from 'react';
import {
  Stack, HStack, Input, Button, IconButton, Text, Divider, Box,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiSave, FiX } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

export default function TeamsTab() {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [newTeam, setNewTeam] = useState('');

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchTeams = async () => {
    setLoading(true);
    const { data } = await supabase.from('labour_teams').select('*').order('name', { ascending: true });
    setTeams(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, []);

  const addTeam = async () => {
    if (!newTeam.trim()) return;
    await supabase.from('labour_teams').insert({ name: newTeam.trim() });
    setNewTeam('');
    fetchTeams();
  };

  const startEdit = (t) => { setEditId(t.id); setEditName(t.name); };
  const cancelEdit = () => { setEditId(null); setEditName(''); };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    await supabase.from('labour_teams').update({ name: editName.trim() }).eq('id', editId);
    cancelEdit();
    fetchTeams();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this team?')) return;
    await supabase.from('labour_teams').delete().eq('id', id);
    fetchTeams();
  };

  return (
    <Stack spacing={4}>
      <HStack>
        <Input
          placeholder="New team name"
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
        />
        <Button leftIcon={<FiPlus />} onClick={addTeam} colorScheme="brand">
          Add
        </Button>
        <IconButton aria-label="Refresh" icon={<FiRefreshCw />} onClick={fetchTeams} variant="ghost" />
      </HStack>

      <Divider />

      <Stack spacing={3}>
        {loading && <Text fontSize="sm" color="gray.500">Loading…</Text>}
        {!loading && teams.length === 0 && (
          <Text fontSize="sm" color="gray.500">No teams yet.</Text>
        )}

        {teams.map((t) => (
          <HStack
            key={t.id}
            justify="space-between"
            p={3}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="lg"
            bg="gray.50"
          >
            {editId === t.id ? (
              <HStack w="100%">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                <IconButton aria-label="Save" icon={<FiSave />} onClick={saveEdit} colorScheme="brand" />
                <IconButton aria-label="Cancel" icon={<FiX />} onClick={cancelEdit} />
              </HStack>
            ) : (
              <>
                <Box flex="1"><Text>{t.name}</Text></Box>
                <HStack>
                  <IconButton aria-label="Edit" icon={<FiEdit2 />} onClick={() => startEdit(t)} />
                  <IconButton aria-label="Delete" icon={<FiTrash2 />} colorScheme="red" variant="outline" onClick={() => del(t.id)} />
                </HStack>
              </>
            )}
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}