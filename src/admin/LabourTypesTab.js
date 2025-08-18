// src/admin/LabourTypesTab.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Stack, HStack, Input, Button, IconButton, Text, Divider, Box, Select, Badge,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiSave, FiX } from 'react-icons/fi';
import { supabase } from '../supabaseClient';

export default function LabourTypesTab() {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState([]);

  const [newType, setNewType] = useState({ team_id: '', type_name: '' });

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: tms }, { data: tys }] = await Promise.all([
      supabase.from('labour_teams').select('*').order('name', { ascending: true }),
      supabase.from('labour_types').select('*').order('type_name', { ascending: true }),
    ]);
    setTeams(tms || []);
    setTypes(tys || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const teamById = useMemo(() => {
    const m = {};
    teams.forEach(t => { m[t.id] = t; });
    return m;
  }, [teams]);

  const addType = async () => {
    const { team_id, type_name } = newType;
    if (!team_id || !type_name.trim()) return;
    await supabase.from('labour_types').insert({ team_id, type_name: type_name.trim() });
    setNewType({ team_id: '', type_name: '' });
    fetchAll();
  };

  const startEdit = (lt) => { setEditId(lt.id); setEditName(lt.type_name); };
  const cancelEdit = () => { setEditId(null); setEditName(''); };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    await supabase.from('labour_types').update({ type_name: editName.trim() }).eq('id', editId);
    cancelEdit();
    fetchAll();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this labour type?')) return;
    await supabase.from('labour_types').delete().eq('id', id);
    fetchAll();
  };

  return (
    <Stack spacing={4}>
      <HStack align="flex-start">
        <Select
          placeholder="Select team"
          value={newType.team_id}
          onChange={(e) => setNewType({ ...newType, team_id: e.target.value })}
          maxW="260px"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
        <Input
          placeholder="New labour type"
          value={newType.type_name}
          onChange={(e) => setNewType({ ...newType, type_name: e.target.value })}
        />
        <Button leftIcon={<FiPlus />} onClick={addType} colorScheme="brand">
          Add
        </Button>
        <IconButton aria-label="Refresh" icon={<FiRefreshCw />} onClick={fetchAll} variant="ghost" />
      </HStack>

      <Divider />

      <Stack spacing={3}>
        {loading && <Text fontSize="sm" color="gray.500">Loading…</Text>}
        {!loading && types.length === 0 && (
          <Text fontSize="sm" color="gray.500">No labour types yet.</Text>
        )}

        {types.map((lt) => (
          <HStack
            key={lt.id}
            justify="space-between"
            p={3}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="lg"
            bg="gray.50"
          >
            {editId === lt.id ? (
              <HStack w="100%">
                <Badge colorScheme="gray">{teamById[lt.team_id]?.name || `Team #${lt.team_id}`}</Badge>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                <IconButton aria-label="Save" icon={<FiSave />} onClick={saveEdit} colorScheme="brand" />
                <IconButton aria-label="Cancel" icon={<FiX />} onClick={cancelEdit} />
              </HStack>
            ) : (
              <>
                <HStack flex="1">
                  <Badge colorScheme="gray">{teamById[lt.team_id]?.name || `Team #${lt.team_id}`}</Badge>
                  <Text>{lt.type_name}</Text>
                </HStack>
                <HStack>
                  <IconButton aria-label="Edit" icon={<FiEdit2 />} onClick={() => startEdit(lt)} />
                  <IconButton aria-label="Delete" icon={<FiTrash2 />} colorScheme="red" variant="outline" onClick={() => del(lt.id)} />
                </HStack>
              </>
            )}
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}