// src/attendance/TeamAttendanceForm.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react';
import { supabase } from '../supabaseClient';

export default function TeamAttendanceForm({ loading, entries, setEntries, disabled }) {
  const [teams, setTeams] = useState([]);                 // [{id, name}]
  const [typesMap, setTypesMap] = useState({});           // team_id -> [{id, type_name}]
  const [refLoading, setRefLoading] = useState(false);
  const isDisabled = disabled || refLoading;

  // Load reference lists (teams, labour_types) once
  useEffect(() => {
    let ignore = false;

    const run = async () => {
      setRefLoading(true);
      const [{ data: t, error: tErr }, { data: lt, error: ltErr }] = await Promise.all([
        supabase.from('labour_teams').select('id,name').order('name'),
        supabase.from('labour_types').select('id,team_id,type_name').order('team_id').order('type_name'),
      ]);

      if (ignore) return;

      if (!tErr && Array.isArray(t)) setTeams(t);
      if (!ltErr && Array.isArray(lt)) {
        const map = {};
        lt.forEach(row => {
          const key = String(row.team_id);
          if (!map[key]) map[key] = [];
          map[key].push({ id: String(row.id), type_name: row.type_name });
        });
        setTypesMap(map);
      }
      setRefLoading(false);
    };

    run();
    return () => { ignore = true; };
  }, []);

  const addRow = () => {
    setEntries([...(entries || []), { team_id: '', labour_type_id: '', count: '' }]);
  };

  const updateRow = (idx, field, value) => {
    const copy = [...entries];
    copy[idx] = { ...copy[idx], [field]: value };
    // reset type if team changes
    if (field === 'team_id') copy[idx].labour_type_id = '';
    setEntries(copy);
  };

  const updateCount = (idx, val) => {
    const v = String(val ?? '').replace(/[^\d]/g, '');
    updateRow(idx, 'count', v);
  };

  const deleteRow = (idx) => {
    const copy = [...entries];
    copy.splice(idx, 1);
    setEntries(copy);
  };

  return (
    <Stack spacing={3}>
      {(entries || []).map((row, i) => {
        const teamId = row.team_id || '';
        const typesForTeam = typesMap[teamId] || [];

        return (
          <Box
            key={i}
            bg="gray.50"
            p={3}
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
          >
            <Stack spacing={2}>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Team</Text>
                <Select
                  placeholder={refLoading ? 'Loading teams…' : 'Select Team'}
                  value={teamId}
                  onChange={(e) => updateRow(i, 'team_id', e.target.value)}
                  isDisabled={isDisabled}
                >
                  {teams.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Type</Text>
                <Select
                  placeholder={teamId ? 'Select Type' : 'Select team first'}
                  value={row.labour_type_id || ''}
                  onChange={(e) => updateRow(i, 'labour_type_id', e.target.value)}
                  isDisabled={isDisabled || !teamId}
                >
                  {typesForTeam.map(t => (
                    <option key={t.id} value={t.id}>{t.type_name}</option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Count</Text>
                <NumberInput
                  min={1}
                  value={row.count || ''}
                  onChange={(_, val) => updateCount(i, val)}
                  isDisabled={isDisabled}
                >
                  <NumberInputField placeholder="Enter count" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>

              <Flex justify="flex-end">
                <Button
                  size="xs"
                  colorScheme="red"
                  onClick={() => deleteRow(i)}
                  visibility={!isDisabled ? 'visible' : 'hidden'}
                >
                  Remove
                </Button>
              </Flex>
            </Stack>
          </Box>
        );
      })}

      {!disabled && (
        <Button onClick={addRow} variant="outline" isDisabled={isDisabled}>
          + Add Entry
        </Button>
      )}
    </Stack>
  );
}