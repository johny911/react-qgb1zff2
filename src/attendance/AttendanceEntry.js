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

  const [entries, setEntries] = useState([]);
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchAttendance() {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', project.id)
        .eq('date', date)
        .order('created_at');

      if (!ignore) {
        if (error) {
          console.error(error);
          toast({
            title: 'Error loading attendance',
            description: error.message,
            status: 'error',
          });
        } else if (data && data.length > 0) {
          setEntries(data);
          setAttendanceExists(true);
          setEditMode(true);
        } else {
          setEntries([]);
          setAttendanceExists(false);
          setEditMode(true);
        }
        setLoading(false);
      }
    }

    fetchAttendance();
    return () => {
      ignore = true;
    };
  }, [project.id, date, toast]);

  const handleSubmit = async () => {
    if (!editMode) return;

    // Clear existing before insert (if editing)
    if (attendanceExists) {
      const { error: delError } = await supabase
        .from('attendance')
        .delete()
        .eq('project_id', project.id)
        .eq('date', date);

      if (delError) {
        toast({
          title: 'Error updating attendance',
          description: delError.message,
          status: 'error',
        });
        return;
      }
    }

    if (entries.length === 0) {
      toast({
        title: 'Nothing to save',
        description: 'Please add at least one team entry.',
        status: 'warning',
      });
      return;
    }

    const { error } = await supabase.from('attendance').insert(
      entries.map((e) => ({
        ...e,
        project_id: project.id,
        date,
      }))
    );

    if (error) {
      toast({
        title: 'Error saving attendance',
        description: error.message,
        status: 'error',
      });
    } else {
      toast({
        title: 'Attendance saved',
        description: 'Your attendance has been recorded.',
        status: 'success',
      });
      setAttendanceExists(true);
      setEditMode(false);
    }
  };

  const canSave = () => entries.length > 0;

  return (
    <Box>
      {/* Header */}
      <Flex align="center" justify="space-between" mb={4}>
        <Heading size="sm">Enter Attendance</Heading>
        <Badge colorScheme={attendanceExists ? 'purple' : 'yellow'} variant="subtle">
          {attendanceExists ? 'Editing existing attendance' : 'Draft'}
        </Badge>
      </Flex>

      {/* Form */}
      <TeamAttendanceForm entries={entries} setEntries={setEntries} />

      {/* Footer buttons */}
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

          {/* Back button restored below Save */}
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