// src/MainAttendanceApp.js
import React, { useMemo } from 'react';
import {
  Box, Button, Heading, Stack,
} from '@chakra-ui/react';
import usePersistedState from './hooks/usePersistedState';
import { BUILD_VERSION } from './version';
import { SectionCard, ActionButton } from './components/ui/Kit';
import WorkReport from './WorkReport';
import ViewWorkReports from './ViewWorkReports';
import {
  useReferenceData,
  EnterAttendance,
  ViewAttendance,
  BuildTag,
} from './AttendanceScreens';

export default function MainAttendanceApp({ user, onLogout }) {
  const userKey = user?.id || 'anon';
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Light navigation + shared state
  const [screen, setScreen] = usePersistedState(`ui:screen:${userKey}`, 'home');
  const [projectId, setProjectId] = usePersistedState(`ui:project:${userKey}`, '');
  const [date, setDate] = usePersistedState(`ui:date:${userKey}`, today);

  // One place to hold today's draft rows (so we keep them if user navigates between tabs)
  const rowsKey = `att:rows:${userKey}:${projectId || 'no-project'}:${date || 'no-date'}`;
  const [rows, setRows] = usePersistedState(rowsKey, [{ teamId: '', typeId: '', count: '' }]);

  // Reference data (projects/teams/types) via the robust hook
  const ref = useReferenceData(userKey);

  // Friendly name
  const first = user?.user_metadata?.first_name || '';
  const last  = user?.user_metadata?.last_name || '';
  const displayName = [first, last].filter(Boolean).join(' ') || (user?.email?.split('@')[0] || 'User');

  return (
    <Box bg="gray.50" minH="100vh" py={8} px={4} display="flex" alignItems="flex-start">
      <Box
        maxW="480px"
        w="100%"
        bg="white"
        mx="auto"
        p={{ base: 5, md: 6 }}
        borderRadius="2xl"
        shadow="md"
      >
        {/* HOME */}
        {screen === 'home' && (
          <Stack spacing={5}>
            <Heading size="sm">👋 Welcome, {displayName}</Heading>

            <SectionCard title="Quick actions" subtitle={`Build ${BUILD_VERSION || 'dev'}`}>
              <Stack spacing={3}>
                <ActionButton icon="enter" variant="primary" onClick={() => setScreen('enter')}>
                  + Enter Attendance
                </ActionButton>
                <ActionButton icon="view" variant="outline" onClick={() => setScreen('view')}>
                  View Attendance
                </ActionButton>
                <ActionButton icon="work" variant="outline" onClick={() => setScreen('work')}>
                  Enter Work Report
                </ActionButton>
                <ActionButton icon="viewWork" variant="outline" onClick={() => setScreen('view-work')}>
                  View Work Reports
                </ActionButton>
              </Stack>

              <Button mt={6} size="sm" variant="outline" w="100%" onClick={onLogout}>
                Logout
              </Button>
            </SectionCard>
          </Stack>
        )}

        {/* VIEW */}
        {screen === 'view' && (
          <ViewAttendance
            refData={ref}
            projectId={projectId}
            setProjectId={setProjectId}
            date={date}
            setDate={setDate}
            onBack={() => setScreen('home')}
          />
        )}

        {/* ENTER */}
        {screen === 'enter' && (
          <EnterAttendance
            refData={ref}
            projectId={projectId}
            setProjectId={setProjectId}
            date={date}
            setDate={setDate}
            rows={rows}
            setRows={setRows}
            onBack={() => setScreen('home')}
          />
        )}

        {/* WORK / VIEW-WORK */}
        {screen === 'work' && <WorkReport onBack={() => setScreen('home')} />}
        {screen === 'view-work' && <ViewWorkReports onBack={() => setScreen('home')} />}
      </Box>

      <BuildTag />
    </Box>
  );
}