// src/AdminDashboard.js
import React from 'react';
import {
  Box,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  HStack,
  Badge,
  Button,
} from '@chakra-ui/react';
import { SectionCard } from './components/ui/Kit';
import ProjectsTab from './admin/ProjectsTab';
import TeamsTab from './admin/TeamsTab';
import LabourTypesTab from './admin/LabourTypesTab';
import AssignTab from './admin/AssignTab';
import BuildTag from './components/BuildTag'; // ⬅️ build badge with triple-tap hard refresh

export default function AdminDashboard({ user, onLogout }) {
  return (
    <Box bg="gray.50" minH="100vh" py={8} px={4}>
      <Box maxW="800px" mx="auto">
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Admin Dashboard</Heading>
          <HStack>
            <Badge colorScheme="purple" variant="subtle">
              {user?.email}
            </Badge>
            <Button size="sm" variant="outline" onClick={onLogout}>
              Logout
            </Button>
          </HStack>
        </HStack>

        <SectionCard
          title="Controls"
          subtitle="Manage projects, teams, and labour types. Assign engineers to projects."
        >
          <Tabs variant="enclosed" colorScheme="brand" isFitted>
            <TabList>
              <Tab>Projects</Tab>
              <Tab>Teams</Tab>
              <Tab>Labour Types</Tab>
              <Tab>Assign</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <ProjectsTab />
              </TabPanel>
              <TabPanel>
                <TeamsTab />
              </TabPanel>
              <TabPanel>
                <LabourTypesTab />
              </TabPanel>
              <TabPanel>
                <AssignTab />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </SectionCard>

        <Text mt={3} fontSize="xs" color="gray.500">
          Tip: pull down to refresh if you add data elsewhere.
        </Text>
      </Box>

      {/* Build/version tag (triple-tap to hard refresh) */}
      <BuildTag />
    </Box>
  );
}