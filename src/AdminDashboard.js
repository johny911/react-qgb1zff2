// src/AdminDashboard.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  HStack,
  VStack,
  Input,
  Select,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  useToast,
  Divider,
  Flex,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiPlus, FiUserCheck, FiRefreshCw } from 'react-icons/fi';
import { supabase } from './supabaseClient';
import { SectionCard } from './components/ui/Kit';

export default function AdminDashboard({ user, onLogout }) {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState([]);
  const [engineers, setEngineers] = useState([]);

  const [newProject, setNewProject] = useState('');
  const [newTeam, setNewTeam] = useState('');
  const [newType, setNewType] = useState({ team_id: '', type_name: '' });

  const [editProjectId, setEditProjectId] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');

  const [editTeamId, setEditTeamId] = useState(null);
  const [editTeamName, setEditTeamName] = useState('');

  const [editTypeId, setEditTypeId] = useState(null);
  const [editTypeName, setEditTypeName] = useState('');

  const [assignedProjectId, setAssignedProjectId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [{ data: proj }, { data: team }, { data: type }, { data: engs }] =
        await Promise.all([
          supabase.from('projects').select('*').order('name', { ascending: true }),
          supabase.from('labour_teams').select('*').order('name', { ascending: true }),
          supabase.from('labour_types').select('*').order('type_name', { ascending: true }),
          supabase.from('users').select('*').eq('role', 'engineer').order('email', { ascending: true }),
        ]);

      setProjects(proj || []);
      setTeams(team || []);
      setTypes(type || []);
      setEngineers(engs || []);
    } finally {
      setLoading(false);
    }
  };

  const teamById = useMemo(() => {
    const m = {};
    teams.forEach(t => { m[t.id] = t; });
    return m;
  }, [teams]);

  const addProject = async () => {
    if (!newProject.trim()) return;
    const { error } = await supabase.from('projects').insert({ name: newProject.trim() });
    if (error) return toast({ status: 'error', title: error.message });
    setNewProject('');
    toast({ status: 'success', title: 'Project added' });
    fetchAll();
  };

  const startEditProject = (p) => {
    setEditProjectId(p.id);
    setEditProjectName(p.name);
  };

  const saveProject = async () => {
    if (!editProjectName.trim()) return;
    const { error } = await supabase
      .from('projects')
      .update({ name: editProjectName.trim() })
      .eq('id', editProjectId);
    if (error) return toast({ status: 'error', title: error.message });
    setEditProjectId(null);
    setEditProjectName('');
    toast({ status: 'success', title: 'Project updated' });
    fetchAll();
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return toast({ status: 'error', title: error.message });
    toast({ status: 'success', title: 'Project deleted' });
    fetchAll();
  };

  const addTeam = async () => {
    if (!newTeam.trim()) return;
    const { error } = await supabase.from('labour_teams').insert({ name: newTeam.trim() });
    if (error) return toast({ status: 'error', title: error.message });
    setNewTeam('');
    toast({ status: 'success', title: 'Team added' });
    fetchAll();
  };

  const startEditTeam = (t) => {
    setEditTeamId(t.id);
    setEditTeamName(t.name);
  };

  const saveTeam = async () => {
    if (!editTeamName.trim()) return;
    const { error } = await supabase
      .from('labour_teams')
      .update({ name: editTeamName.trim() })
      .eq('id', editTeamId);
    if (error) return toast({ status: 'error', title: error.message });
    setEditTeamId(null);
    setEditTeamName('');
    toast({ status: 'success', title: 'Team updated' });
    fetchAll();
  };

  const deleteTeam = async (id) => {
    if (!window.confirm('Delete this team?')) return;
    const { error } = await supabase.from('labour_teams').delete().eq('id', id);
    if (error) return toast({ status: 'error', title: error.message });
    toast({ status: 'success', title: 'Team deleted' });
    fetchAll();
  };

  const addType = async () => {
    const { team_id, type_name } = newType;
    if (!team_id || !type_name.trim()) return;
    const { error } = await supabase.from('labour_types').insert({
      team_id,
      type_name: type_name.trim(),
    });
    if (error) return toast({ status: 'error', title: error.message });
    setNewType({ team_id: '', type_name: '' });
    toast({ status: 'success', title: 'Labour type added' });
    fetchAll();
  };

  const startEditType = (t) => {
    setEditTypeId(t.id);
    setEditTypeName(t.type_name);
  };

  const saveType = async () => {
    if (!editTypeName.trim()) return;
    const { error } = await supabase
      .from('labour_types')
      .update({ type_name: editTypeName.trim() })
      .eq('id', editTypeId);
    if (error) return toast({ status: 'error', title: error.message });
    setEditTypeId(null);
    setEditTypeName('');
    toast({ status: 'success', title: 'Labour type updated' });
    fetchAll();
  };

  const deleteType = async (id) => {
    if (!window.confirm('Delete this labour type?')) return;
    const { error } = await supabase.from('labour_types').delete().eq('id', id);
    if (error) return toast({ status: 'error', title: error.message });
    toast({ status: 'success', title: 'Labour type deleted' });
    fetchAll();
  };

  const assignProject = async () => {
    if (!assignedProjectId || !assignedUserId) {
      return toast({ status: 'info', title: 'Select an engineer and a project' });
    }
    const { error } = await supabase
      .from('project_assignments')
      .insert({ project_id: assignedProjectId, user_id: assignedUserId });
    if (error) return toast({ status: 'error', title: error.message });
    setAssignedProjectId('');
    setAssignedUserId('');
    toast({ status: 'success', title: 'Assigned successfully' });
  };

  return (
    <Box bg="gray.50" minH="100vh" py={8} px={4}>
      <Box maxW="800px" mx="auto">
        <VStack align="stretch" spacing={5}>
          <Flex align="center" justify="space-between">
            <Heading size="md">Admin Dashboard</Heading>
            <HStack>
              <Badge colorScheme="purple" variant="subtle">{user?.email}</Badge>
              <Button size="sm" variant="outline" onClick={onLogout}>Logout</Button>
            </HStack>
          </Flex>

          <SectionCard title="Controls" subtitle="Manage projects, teams, and labour types. Assign engineers to projects.">
            <Tabs variant="enclosed" colorScheme="brand">
              <TabList>
                <Tab>Projects</Tab>
                <Tab>Teams</Tab>
                <Tab>Labour Types</Tab>
                <Tab>Assign</Tab>
              </TabList>

              <TabPanels>
                {/* PROJECTS */}
                <TabPanel>
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
                      <IconButton
                        aria-label="Refresh"
                        icon={<FiRefreshCw />}
                        onClick={fetchAll}
                        variant="ghost"
                      />
                    </HStack>

                    <Divider />

                    <Stack spacing={2}>
                      {projects.length === 0 && (
                        <Text color="textMuted" fontSize="sm">No projects yet.</Text>
                      )}
                      {projects.map((p) => (
                        <HStack
                          key={p.id}
                          justify="space-between"
                          p={3}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          bg="gray.50"
                        >
                          {editProjectId === p.id ? (
                            <HStack flex="1">
                              <Input
                                value={editProjectName}
                                onChange={(e) => setEditProjectName(e.target.value)}
                                autoFocus
                              />
                              <Button size="sm" onClick={saveProject} colorScheme="brand">Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditProjectId(null)}>Cancel</Button>
                            </HStack>
                          ) : (
                            <>
                              <Text>{p.name}</Text>
                              <HStack>
                                <IconButton
                                  aria-label="Edit"
                                  icon={<FiEdit2 />}
                                  size="sm"
                                  onClick={() => startEditProject(p)}
                                />
                                <IconButton
                                  aria-label="Delete"
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="outline"
                                  onClick={() => deleteProject(p.id)}
                                />
                              </HStack>
                            </>
                          )}
                        </HStack>
                      ))}
                    </Stack>
                  </Stack>
                </TabPanel>

                {/* TEAMS */}
                <TabPanel>
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
                      <IconButton
                        aria-label="Refresh"
                        icon={<FiRefreshCw />}
                        onClick={fetchAll}
                        variant="ghost"
                      />
                    </HStack>

                    <Divider />

                    <Stack spacing={2}>
                      {teams.length === 0 && (
                        <Text color="textMuted" fontSize="sm">No teams yet.</Text>
                      )}
                      {teams.map((t) => (
                        <HStack
                          key={t.id}
                          justify="space-between"
                          p={3}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          bg="gray.50"
                        >
                          {editTeamId === t.id ? (
                            <HStack flex="1">
                              <Input
                                value={editTeamName}
                                onChange={(e) => setEditTeamName(e.target.value)}
                                autoFocus
                              />
                              <Button size="sm" onClick={saveTeam} colorScheme="brand">Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditTeamId(null)}>Cancel</Button>
                            </HStack>
                          ) : (
                            <>
                              <Text>{t.name}</Text>
                              <HStack>
                                <IconButton
                                  aria-label="Edit"
                                  icon={<FiEdit2 />}
                                  size="sm"
                                  onClick={() => startEditTeam(t)}
                                />
                                <IconButton
                                  aria-label="Delete"
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="outline"
                                  onClick={() => deleteTeam(t.id)}
                                />
                              </HStack>
                            </>
                          )}
                        </HStack>
                      ))}
                    </Stack>
                  </Stack>
                </TabPanel>

                {/* LABOUR TYPES. */}
                <TabPanel>
                  <Stack spacing={4}>
                    <HStack align="flex-start">
                      <Select
                        placeholder="Select team"
                        value={newType.team_id}
                        onChange={(e) => setNewType({ ...newType, team_id: e.target.value })}
                        maxW="260px"
                      >
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
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
                      <IconButton
                        aria-label="Refresh"
                        icon={<FiRefreshCw />}
                        onClick={fetchAll}
                        variant="ghost"
                      />
                    </HStack>

                    <Divider />

                    <Stack spacing={2}>
                      {types.length === 0 && (
                        <Text color="textMuted" fontSize="sm">No labour types yet.</Text>
                      )}
                      {types.map((t) => (
                        <HStack
                          key={t.id}
                          justify="space-between"
                          p={3}
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          bg="gray.50"
                        >
                          {editTypeId === t.id ? (
                            <HStack flex="1">
                              <Badge colorScheme="gray" mr={2}>
                                {teamById[t.team_id]?.name || `Team #${t.team_id}`}
                              </Badge>
                              <Input
                                value={editTypeName}
                                onChange={(e) => setEditTypeName(e.target.value)}
                                autoFocus
                              />
                              <Button size="sm" onClick={saveType} colorScheme="brand">Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditTypeId(null)}>Cancel</Button>
                            </HStack>
                          ) : (
                            <>
                              <HStack>
                                <Badge colorScheme="gray">
                                  {teamById[t.team_id]?.name || `Team #${t.team_id}`}
                                </Badge>
                                <Text>{t.type_name}</Text>
                              </HStack>
                              <HStack>
                                <IconButton
                                  aria-label="Edit"
                                  icon={<FiEdit2 />}
                                  size="sm"
                                  onClick={() => startEditType(t)}
                                />
                                <IconButton
                                  aria-label="Delete"
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="outline"
                                  onClick={() => deleteType(t.id)}
                                />
                              </HStack>
                            </>
                          )}
                        </HStack>
                      ))}
                    </Stack>
                  </Stack>
                </TabPanel>

                {/* ASSIGN */}
                <TabPanel>
                  <Stack spacing={4}>
                    <SectionCard
                      title="Assign Project"
                      subtitle="Assign an engineer to a project."
                    >
                      <VStack align="stretch" spacing={3}>
                        <Box>
                          <Text fontSize="sm" color="textMuted" mb={1}>Engineer</Text>
                          <Select
                            placeholder="Select engineer"
                            value={assignedUserId}
                            onChange={(e) => setAssignedUserId(e.target.value)}
                          >
                            {engineers.map(u => (
                              <option key={u.id} value={u.id}>{u.email}</option>
                            ))}
                          </Select>
                        </Box>
                        <Box>
                          <Text fontSize="sm" color="textMuted" mb={1}>Project</Text>
                          <Select
                            placeholder="Select project"
                            value={assignedProjectId}
                            onChange={(e) => setAssignedProjectId(e.target.value)}
                          >
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </Select>
                        </Box>
                        <Button
                          leftIcon={<FiUserCheck />}
                          colorScheme="brand"
                          onClick={assignProject}
                        >
                          Assign
                        </Button>
                      </VStack>
                    </SectionCard>
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Tabs>

            <HStack justify="space-between" pt={2}>
              <Text fontSize="xs" color="textMuted">
                {loading ? 'Refreshing…' : 'Up to date'}
              </Text>
              <Button size="xs" leftIcon={<FiRefreshCw />} variant="ghost" onClick={fetchAll}>
                Refresh
              </Button>
            </HStack>
          </SectionCard>
        </VStack>
      </Box>
    </Box>
  );
}