// src/admin/LabourTypesTab.js
import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, HStack, Input, IconButton, Button, Stack, Text, Select, Badge
} from '@chakra-ui/react';
import { FiPlus, FiRefreshCcw, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

export default function LabourTypesTab() {
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState([]);
  const [newTeamId, setNewTeamId] = useState('');
  const [newType, setNewType] = useState('');

  const teamById = useMemo(() => {
    const m = {}; teams.forEach(t => { m[t.id] = t; }); return m;
  }, [teams]);

  const refresh = async () => {
    const [{ data: t }, { data: ty }] = await Promise.all([
      supabase.from('labour_teams').select('*').order('name', { ascending: true }),
      supabase.from('labour_types').select('*').order('type_name', { ascending: true }),
    ]);
    setTeams(t || []); setTypes(ty || []);
  };
  useEffect(() => { refresh(); }, []);

  const addType = async () => {
    if (!newTeamId || !newType.trim()) return;
    await supabase.from('labour_types').insert({ team_id: newTeamId, type_name: newType.trim() });
    setNewType(''); refresh();
  };
  const editType = async (row) => {
    const name = prompt('Edit labour type name:', row.type_name);
    if (name && name.trim()) {
      await supabase.from('labour_types').update({ type_name: name.trim() }).eq('id', row.id);
      refresh();
    }
  };
  const deleteType = async (row) => {
    if (confirm('Delete this labour type?')) {
      await supabase.from('labour_types').delete().eq('id', row.id);
      refresh();
    }
  };

  return (
    <Stack spacing={4} w="100%">
      {/* Controls row that WRAPS and never overflows */}
      <HStack
        w="100%"
        spacing={3}
        align="stretch"
        flexWrap="wrap"
      >
        <Select
          placeholder="Select team"
          value={newTeamId}
          onChange={(e) => setNewTeamId(e.target.value)}
          flex={{ base: '1 1 100%', sm: '1 1 45%' }}
          minW="180px"
          minH="42px"
        >
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>

        <Input
          placeholder="New labour type"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          flex={{ base: '1 1 100%', sm: '1 1 45%' }}
          minW="180px"
          minH="42px"
        />

        <Button
          onClick={addType}
          leftIcon={<FiPlus />}
          flex="0 0 auto"
          minH="42px"
        >
          Add
        </Button>

        <IconButton
          aria-label="Refresh"
          icon={<FiRefreshCcw />}
          onClick={refresh}
          variant="outline"
          flex="0 0 auto"
          minH="42px"
        />
      </HStack>

      {/* List */}
      <Stack spacing={3}>
        {types.map((row) => (
          <HStack
            key={row.id}
            w="100%"
            p={3}
            bg="gray.50"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="lg"
            spacing={3}
            align="center"
          >
            <Box flex="1" minW={0}>
              <Badge colorScheme="gray" mb={1} whiteSpace="nowrap">
                {teamById[row.team_id]?.name || 'Team'}
              </Badge>
              <Text noOfLines={2} fontWeight="semibold">{row.type_name}</Text>
            </Box>
            <HStack spacing={2} flexShrink={0}>
              <IconButton aria-label="Edit" icon={<FiEdit2 />} onClick={() => editType(row)} />
              <IconButton aria-label="Delete" icon={<FiTrash2 />} onClick={() => deleteType(row)} />
            </HStack>
          </HStack>
        ))}
        {types.length === 0 && (
          <Box color="gray.500" fontSize="sm">No labour types yet.</Box>
        )}
      </Stack>
    </Stack>
  );
}