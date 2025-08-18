import React, { useEffect, useState } from 'react';
import {
  Box, HStack, Input, IconButton, Button, Stack, Text
} from '@chakra-ui/react';
import { FiPlus, FiRefreshCcw, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

export default function TeamsTab() {
  const [teams, setTeams] = useState([]);
  const [newTeam, setNewTeam] = useState('');
  const refresh = async () => {
    const { data } = await supabase.from('labour_teams').select('*').order('name', { ascending: true });
    setTeams(data || []);
  };
  useEffect(() => { refresh(); }, []);

  const addTeam = async () => {
    if (!newTeam.trim()) return;
    await supabase.from('labour_teams').insert({ name: newTeam.trim() });
    setNewTeam('');
    refresh();
  };
  const editTeam = async (t) => {
    const name = prompt('Edit team name:', t.name);
    if (name && name.trim()) {
      await supabase.from('labour_teams').update({ name: name.trim() }).eq('id', t.id);
      refresh();
    }
  };
  const deleteTeam = async (t) => {
    if (confirm('Delete this team?')) {
      await supabase.from('labour_teams').delete().eq('id', t.id);
      refresh();
    }
  };

  return (
    <Stack spacing={4} w="100%">
      <HStack w="100%" spacing={3} align="stretch">
        <Input
          placeholder="New team name"
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
          flex="1"
          minW={0}
        />
        <Button onClick={addTeam} leftIcon={<FiPlus />} flexShrink={0}>Add</Button>
        <IconButton aria-label="Refresh" icon={<FiRefreshCcw />} onClick={refresh} variant="outline" flexShrink={0} />
      </HStack>

      <Stack spacing={3}>
        {teams.map((t) => (
          <HStack
            key={t.id}
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
              {t.name}
            </Text>
            <HStack spacing={2} flexShrink={0}>
              <IconButton aria-label="Edit" icon={<FiEdit2 />} onClick={() => editTeam(t)} />
              <IconButton aria-label="Delete" icon={<FiTrash2 />} onClick={() => deleteTeam(t)} />
            </HStack>
          </HStack>
        ))}
        {teams.length === 0 && (
          <Box color="gray.500" fontSize="sm">No teams yet.</Box>
        )}
      </Stack>
    </Stack>
  );
}