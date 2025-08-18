// src/WorkReport.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Select,
  Input,
  Heading,
  Text,
  Stack,
  Flex,
  Divider,
  Badge,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
} from '@chakra-ui/react';
import { SectionCard } from './components/ui/Kit';
import { supabase } from './supabaseClient';

export default function WorkReport({ onBack }) {
  const toast = useToast();

  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [works, setWorks] = useState([
    {
      description: '',
      quantity: '',
      uom: '',
      labourAllotments: [{ teamId: '', typeId: '', count: '' }],
    },
  ]);

  // Attendance map: `${teamId}-${typeId}` -> total count available
  const [attendanceMap, setAttendanceMap] = useState({});
  // Remaining map after allotments deducted
  const [remainingMap, setRemainingMap] = useState({});

  // Existing report (if any) for (project, date)
  const [existingReportId, setExistingReportId] = useState(null);
  const isEditing = !!existingReportId;

  // Load static data
  useEffect(() => {
    (async () => {
      const { data: projectsData } = await supabase.from('projects').select('*');
      const { data: teamsData } = await supabase.from('labour_teams').select('*');
      const { data: typesData } = await supabase.from('labour_types').select('*');

      const typeMap = {};
      (typesData || []).forEach((t) => {
        typeMap[t.team_id] = typeMap[t.team_id] || [];
        typeMap[t.team_id].push(t);
      });

      setProjects(projectsData || []);
      setTeams(teamsData || []);
      setTypes(typeMap);
    })();
  }, []);

  // Load attendance for selected project/date AND detect/load existing report
  useEffect(() => {
    if (!selectedProject || !date) {
      setExistingReportId(null);
      return;
    }
    (async () => {
      // 1) Attendance for remaining calculations
      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('date', date);

      const attendance = {};
      (att || []).forEach((row) => {
        const key = `${row.team_id}-${row.labour_type_id}`;
        attendance[key] = (attendance[key] || 0) + row.count;
      });
      setAttendanceMap(attendance);

      // 2) Check if a work_report exists for (project, date)
      const { data: existing, error } = await supabase
        .from('work_reports')
        .select('id')
        .eq('project_id', selectedProject)
        .eq('date', date)
        .maybeSingle();

      if (error) {
        console.error('work_reports lookup error:', error.message);
        setExistingReportId(null);
        // Keep the form for new
        setRemainingMap({ ...attendance });
        return;
      }

      if (existing?.id) {
        setExistingReportId(existing.id);

        // Load existing works + labours
        // Fetch all work_allotments for the report
        const { data: allotments } = await supabase
          .from('work_allotments')
          .select('id, work_description, quantity, uom')
          .eq('report_id', existing.id)
          .order('id', { ascending: true });

        // For each allotment, fetch labours
        const hydrated = [];
        for (const wa of allotments || []) {
          const { data: labours } = await supabase
            .from('work_report_labours')
            .select('team_id, labour_type_id, count')
            .eq('work_allotment_id', wa.id)
            .order('id', { ascending: true });

          hydrated.push({
            description: wa.work_description || '',
            quantity: String(wa.quantity ?? ''),
            uom: wa.uom || '',
            labourAllotments: (labours || []).map((l) => ({
              teamId: String(l.team_id || ''),
              typeId: String(l.labour_type_id || ''),
              count: String(l.count || ''),
            })),
          });
        }

        // If no works present, keep one blank work
        setWorks(hydrated.length ? hydrated : [
          {
            description: '',
            quantity: '',
            uom: '',
            labourAllotments: [{ teamId: '', typeId: '', count: '' }],
          },
        ]);

        // Recompute remaining after loading existing (use current form values)
        setTimeout(() => updateRemainingCounts(attendance), 0);
      } else {
        // No existing report ⇒ new mode
        setExistingReportId(null);
        setWorks([
          {
            description: '',
            quantity: '',
            uom: '',
            labourAllotments: [{ teamId: '', typeId: '', count: '' }],
          },
        ]);
        setRemainingMap({ ...attendance });
      }
    })();
  }, [selectedProject, date]);

  // Recompute remaining after any allotment change
  const updateRemainingCounts = (base = attendanceMap) => {
    const used = {};
    works.forEach((w) =>
      w.labourAllotments.forEach((a) => {
        if (!a.teamId || !a.typeId) return;
        const key = `${a.teamId}-${a.typeId}`;
        used[key] = (used[key] || 0) + parseInt(a.count || '0', 10);
      })
    );
    const rem = {};
    Object.keys(base).forEach((key) => {
      rem[key] = base[key] - (used[key] || 0);
    });
    setRemainingMap(rem);
  };

  // ---- Handlers ----
  const handleWorkChange = (wIdx, field, value) => {
    const list = [...works];
    list[wIdx][field] = value;
    setWorks(list);
  };

  const handleAllotmentChange = (wIdx, aIdx, field, value) => {
    const list = [...works];
    const all = list[wIdx].labourAllotments[aIdx];
    all[field] = value;
    if (field === 'teamId') all.typeId = '';
    setWorks(list);
    updateRemainingCounts();
  };

  const handleAllotmentCount = (wIdx, aIdx, value) => {
    const val = String(value ?? '').replace(/[^\d]/g, '');
    handleAllotmentChange(wIdx, aIdx, 'count', val);
  };

  const addWork = () => {
    setWorks([
      ...works,
      {
        description: '',
        quantity: '',
        uom: '',
        labourAllotments: [{ teamId: '', typeId: '', count: '' }],
      },
    ]);
  };

  const removeWork = (wIdx) => {
    const list = [...works];
    list.splice(wIdx, 1);
    setWorks(list.length ? list : [
      {
        description: '',
        quantity: '',
        uom: '',
        labourAllotments: [{ teamId: '', typeId: '', count: '' }],
      },
    ]);
    updateRemainingCounts();
  };

  const addAllotment = (wIdx) => {
    const list = [...works];
    list[wIdx].labourAllotments.push({ teamId: '', typeId: '', count: '' });
    setWorks(list);
  };

  const removeAllotment = (wIdx, aIdx) => {
    const list = [...works];
    list[wIdx].labourAllotments.splice(aIdx, 1);
    if (list[wIdx].labourAllotments.length === 0) {
      list[wIdx].labourAllotments.push({ teamId: '', typeId: '', count: '' });
    }
    setWorks(list);
    updateRemainingCounts();
  };

  const allRemainingZero = () =>
    Object.values(remainingMap).every((v) => v === 0);

  const canSubmit = () => {
    if (!selectedProject || !date) return false;
    for (const w of works) {
      if (!w.description || !w.quantity || !w.uom) return false;
      for (const a of w.labourAllotments) {
        if (!a.teamId || !a.typeId || !a.count || parseInt(a.count, 10) <= 0) return false;
      }
    }
    if (!allRemainingZero()) return false;
    return true;
  };

  // Create new report
  const createReport = async () => {
    const { data: existing } = await supabase
      .from('work_reports')
      .select('id')
      .eq('project_id', selectedProject)
      .eq('date', date)
      .maybeSingle();

    if (existing?.id) {
      toast({
        title: 'Report already exists',
        description: 'Loaded the existing report for editing.',
        status: 'info',
        duration: 2000,
      });
      setExistingReportId(existing.id);
      return;
    }

    const { data: report, error: reportErr } = await supabase
      .from('work_reports')
      .insert({
        project_id: selectedProject,
        date,
        description: `Work Report for ${date}`,
      })
      .select()
      .single();

    if (reportErr || !report) {
      throw new Error(reportErr?.message || 'Create report failed');
    }

    // Insert works + labours
    for (let work of works) {
      const { data: wa, error: waErr } = await supabase
        .from('work_allotments')
        .insert({
          report_id: report.id,
          work_description: work.description,
          quantity: work.quantity,
          uom: work.uom,
        })
        .select()
        .single();
      if (waErr || !wa) throw new Error(waErr?.message || 'Create allotment failed');

      const labourRows = work.labourAllotments.map((a) => ({
        work_allotment_id: wa.id,
        team_id: a.teamId,
        labour_type_id: a.typeId,
        count: parseInt(a.count, 10),
      }));
      const { error: labErr } = await supabase.from('work_report_labours').insert(labourRows);
      if (labErr) throw new Error(labErr.message || 'Create labours failed');
    }

    setExistingReportId(report.id);
  };

  // Update existing report: replace all allotments + labours
  const updateReport = async () => {
    if (!existingReportId) return;

    // Optional: update top-level description
    await supabase
      .from('work_reports')
      .update({ description: `Work Report for ${date}` })
      .eq('id', existingReportId);

    // Fetch all allotment ids
    const { data: oldAllotments } = await supabase
      .from('work_allotments')
      .select('id')
      .eq('report_id', existingReportId);

    const allotmentIds = (oldAllotments || []).map((a) => a.id);

    if (allotmentIds.length) {
      // Delete children first
      await supabase
        .from('work_report_labours')
        .delete()
        .in('work_allotment_id', allotmentIds);

      // Delete allotments
      await supabase
        .from('work_allotments')
        .delete()
        .eq('report_id', existingReportId);
    }

    // Re-create allotments + labours
    for (let work of works) {
      const { data: wa, error: waErr } = await supabase
        .from('work_allotments')
        .insert({
          report_id: existingReportId,
          work_description: work.description,
          quantity: work.quantity,
          uom: work.uom,
        })
        .select()
        .single();
      if (waErr || !wa) throw new Error(waErr?.message || 'Recreate allotment failed');

      const labourRows = work.labourAllotments.map((a) => ({
        work_allotment_id: wa.id,
        team_id: a.teamId,
        labour_type_id: a.typeId,
        count: parseInt(a.count, 10),
      }));
      const { error: labErr } = await supabase.from('work_report_labours').insert(labourRows);
      if (labErr) throw new Error(labErr.message || 'Recreate labours failed');
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      toast({
        title: 'Please complete all fields',
        description: 'Fill all fields and allot all available labours (no remainder).',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    try {
      if (isEditing) {
        await updateReport();
        toast({ title: 'Work report updated', status: 'success', duration: 1800 });
      } else {
        await createReport();
        toast({ title: 'Work report submitted', status: 'success', duration: 1800 });
      }
      onBack();
    } catch (e) {
      toast({
        title: isEditing ? 'Update failed' : 'Submit failed',
        description: e.message || 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Stack spacing={5}>
        <Flex align="center" justify="space-between">
          <Heading size="sm">Enter Work Report</Heading>
          <Badge colorScheme={isEditing ? 'purple' : 'blue'} variant="subtle">
            {isEditing ? 'Editing existing report' : 'New report'}
          </Badge>
        </Flex>

        {/* Details */}
        <SectionCard title="Details" subtitle="Choose project and date.">
          <Stack spacing={3}>
            <Box>
              <Text fontSize="sm" color="textMuted" mb={1}>Project</Text>
              <Select
                placeholder="Select Project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Box>

            <Box>
              <Text fontSize="sm" color="textMuted" mb={1}>Date</Text>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Box>

            {isEditing && (
              <Text fontSize="sm" color="green.600">
                A report already exists for this project & date. You’re editing it.
              </Text>
            )}
          </Stack>
        </SectionCard>

        {/* Works */}
        <SectionCard title="Works" subtitle="Describe the work and allot labours.">
          <Stack spacing={4}>
            {works.map((work, wIdx) => (
              <Box
                key={wIdx}
                border="1px solid"
                borderColor="gray.200"
                bg="gray.50"
                p={3}
                borderRadius="md"
              >
                <Stack spacing={3}>
                  <Box>
                    <Text fontSize="sm" color="textMuted" mb={1}>Work Description</Text>
                    <Input
                      placeholder="e.g., Plastering wall section A"
                      value={work.description}
                      onChange={(e) => handleWorkChange(wIdx, 'description', e.target.value)}
                    />
                  </Box>

                  <Flex gap={3} wrap="wrap">
                    <Box flex="1 1 120px" minW="140px">
                      <Text fontSize="sm" color="textMuted" mb={1}>Quantity</Text>
                      <NumberInput
                        min={0}
                        value={work.quantity}
                        onChange={(_, val) => handleWorkChange(wIdx, 'quantity', String(val ?? ''))}
                      >
                        <NumberInputField placeholder="e.g., 120" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Box>
                    <Box flex="1 1 120px" minW="140px">
                      <Text fontSize="sm" color="textMuted" mb={1}>UOM</Text>
                      <Input
                        placeholder="e.g., m² / nos"
                        value={work.uom}
                        onChange={(e) => handleWorkChange(wIdx, 'uom', e.target.value)}
                      />
                    </Box>
                  </Flex>

                  <Divider />

                  <Text fontWeight="semibold">Allotted Labours</Text>
                  <Stack spacing={3}>
                    {work.labourAllotments.map((a, aIdx) => {
                      const availableTeams = teams.filter((t) =>
                        Object.keys(attendanceMap).some((k) => k.startsWith(`${t.id}-`))
                      );
                      const availableTypes = (types[a.teamId] || []).filter((t) =>
                        (attendanceMap[`${a.teamId}-${t.id}`] || 0) > 0
                      );

                      const remaining =
                        a.teamId && a.typeId
                          ? (remainingMap[`${a.teamId}-${a.typeId}`] ?? 0)
                          : null;

                      return (
                        <Box key={`${wIdx}-${aIdx}`} bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                          <Flex gap={3} wrap="wrap">
                            <Box flex="1 1 160px" minW="160px">
                              <Text fontSize="sm" color="textMuted" mb={1}>Team</Text>
                              <Select
                                placeholder="Select Team"
                                value={a.teamId}
                                onChange={(e) =>
                                  handleAllotmentChange(wIdx, aIdx, 'teamId', e.target.value)
                                }
                              >
                                {availableTeams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </Select>
                            </Box>

                            <Box flex="1 1 160px" minW="160px">
                              <Text fontSize="sm" color="textMuted" mb={1}>Type</Text>
                              <Select
                                placeholder={a.teamId ? 'Select Type' : 'Select team first'}
                                value={a.typeId}
                                onChange={(e) =>
                                  handleAllotmentChange(wIdx, aIdx, 'typeId', e.target.value)
                                }
                                isDisabled={!a.teamId}
                              >
                                {availableTypes.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.type_name}
                                  </option>
                                ))}
                              </Select>
                            </Box>

                            <Box flex="0 0 120px">
                              <Text fontSize="sm" color="textMuted" mb={1}>Count</Text>
                              <NumberInput
                                min={1}
                                value={a.count}
                                onChange={(_, val) =>
                                  handleAllotmentCount(wIdx, aIdx, String(val ?? ''))
                                }
                              >
                                <NumberInputField placeholder="Count" />
                                <NumberInputStepper>
                                  <NumberIncrementStepper />
                                  <NumberDecrementStepper />
                                </NumberInputStepper>
                              </NumberInput>
                            </Box>
                          </Flex>

                          {a.teamId && a.typeId && (
                            <Text mt={2} fontSize="sm" color={remaining < 0 ? 'red.500' : 'gray.600'}>
                              Remaining: {remaining ?? 0} nos
                            </Text>
                          )}

                          <Flex justify="flex-end" mt={2} gap={2}>
                            <Button size="sm" variant="outline" onClick={() => addAllotment(wIdx)}>
                              + Add Labour
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => removeAllotment(wIdx, aIdx)}
                            >
                              Remove
                            </Button>
                          </Flex>
                        </Box>
                      );
                    })}
                  </Stack>

                  <Flex justify="flex-end" mt={2}>
                    <Button size="sm" colorScheme="red" variant="ghost" onClick={() => removeWork(wIdx)}>
                      Remove Work
                    </Button>
                  </Flex>
                </Stack>
              </Box>
            ))}

            <Button onClick={addWork} variant="outline">
              + Add Work
            </Button>

            <Divider />

            {/* ACTIONS — full width primary, back below */}
            <Box>
              <Button
                colorScheme="brand"
                width="100%"
                size="lg"
                onClick={handleSubmit}
                isDisabled={!canSubmit()}
              >
                {isEditing ? '💾 Update Work Report' : '✅ Submit Work Report'}
              </Button>
              <Button
                variant="outline"
                width="100%"
                mt={3}
                onClick={onBack}
              >
                ← Back
              </Button>
            </Box>
          </Stack>
        </SectionCard>
      </Stack>
    </Box>
  );
}