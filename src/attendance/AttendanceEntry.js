// src/attendance/AttendanceEntry.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Badge,
  Stack,
  useToast,
} from '@chakra-ui/react';
import { supabase } from '../supabaseClient';
import TeamAttendanceForm from './TeamAttendanceForm';

export default function AttendanceEntry({ project, date, setScreen }) {
  const toast = useToast();

  const [entries, setEntries] = useState([]);          // [{ team_id, labour_type_id, count }]
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(true);

  // Load existing attendance for project+date
  useEffect(() => {
    let ignore = false;

    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('team_id, labour_type_id, count')
        .eq('project_id', project.id)
        .eq('date', date);

      if (ignore) return;

      if (error) {
        console.error(error);
        toast({
          title: 'Error loading attendance',
          description: error.message,
          status: 'error',
        });
        setEntries([]);
        setAttendanceExists(false);
        setEditMode(true);
      } else if (data && data.length) {
        setEntries(
          data.map(r => ({
            team_id: String(r.team_id),
            labour_type_id: String(r.labour_type_id),
            count: String(r.count ?? ''),
          }))
        );
        setAttendanceExists(true);
        setEditMode(true); // allow editing by default
      } else {
        setEntries([]);
        setAttendanceExists(false);
        setEditMode(true);
      }
      setLoading(false);
    };

    run();
    return () => { ignore = true; };
  }, [project.id, date, toast]);

  const canSave = () =>
    entries.length > 0 &&
    entries.every(
      e =>
        e.team_id &&
        e.labour_type_id &&
        e.count &&
        !Number.isNaN(parseInt(e.count, 10)) &&
        parseInt(e.count, 10) > 0
    );

  const handleSubmit = async () => {
    if (!editMode) return;

    // Delete existing rows for this (project,date)
    if (attendanceExists) {
      const { error: delErr } = await supabase
        .from('attendance')
        .delete()
        .eq('project_id', project.id)
        .eq('date', date);

      if (delErr) {
        toast({
          title: 'Save failed',
          description: delErr.message,
          status: 'error',
        });
        return;
      }
    }

    // Insert new rows
    const payload = entries.map(e => ({
      project_id: project.id,
      date,
      team_id: e.team_id,
      labour_type_id: e.labour_type_id,
      count: parseInt(e.count, 10),
    }));

    const { error: insErr } = await supabase.from('attendance').insert(payload);
    if (insErr) {
      toast({
        title: 'Save failed',
        description: insErr.message,
        status: 'error',
      });
      return;
    }

    toast({
      title: attendanceExists ? 'Attendance updated' : 'Attendance saved',
      description: `${payload.length} entries for ${date}.`,
      status: 'success',
    });
    setAttendanceExists(true);
    setEditMode(false);
  };

  return (
    <Box>
      {/* Simple header (no back in header) */}
      <Flex align="center" justify="space-between" mb={4}>
        <Heading size="sm">Enter Attendance</Heading>
        <Badge colorScheme={attendanceExists ? 'purple' : 'yellow'} variant="subtle">
          {attendanceExists ? 'Editing existing attendance' : 'Draft'}
        </Badge>
      </Flex>

      {/* Team/type rows editor */}
      <TeamAttendanceForm
        loading={loading}
        entries={entries}
        setEntries={setEntries}
        disabled={!editMode}
      />

      {/* Footer actions */}
      <Box mt={6} width="100%">
        <Stack spacing={3}>
          <Button
            colorScheme="brand"
            width="100%"
            size="lg"
            onClick={handleSubmit}
            isDisabled={!canSave() || !editMode}
          >
            {attendanceExists ? '💾 Update Attendance' : '✅ Save Attendance'}
          </Button>

          {/* Back button restored BELOW save */}
          <Button
            variant="outline"
            width="100%"
            onClick={() => setScreen('home')}
          >
            ← Back
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}