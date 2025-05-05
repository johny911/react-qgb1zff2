// src/components/Home.js
import React from 'react'
import {
  Box,
  Button,
  Grid,
  Heading,
  IconButton,
  Image,
  Flex,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  FiHome,
  FiEye,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi'

export default function Home({
  userName,
  onEnter,
  onView,
  onWork,
  onViewWork,
  onSettings,
  onLogout,
}) {
  return (
    <Box p={4} bg="gray.50" minH="100vh">
      {/* Top bar */}
      <Flex
        as="header"
        justify="space-between"
        align="center"
        mb={6}
        bg="blue.600"
        p={4}
        borderRadius="lg"
        boxShadow="md"
      >
        <Flex align="center">
          <Image
            src="https://via.placeholder.com/40"
            alt="Profile"
            borderRadius="full"
            boxSize="40px"
            mr={3}
          />
          <Heading color="white" size="md">
            SiteTrack
          </Heading>
        </Flex>
        <IconButton
          aria-label="Logout"
          icon={<FiLogOut />}
          size="md"
          variant="ghost"
          color="white"
          onClick={onLogout}
        />
      </Flex>

      {/* Greeting */}
      <VStack spacing={2} align="start" mb={8}>
        <Text fontSize="lg" color="gray.600">
          Good morning,
        </Text>
        <Heading size="xl">{userName}</Heading>
      </VStack>

      {/* Action grid */}
      <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={16}>
        <Button
          leftIcon={<FiHome />}
          colorScheme="blue"
          variant="solid"
          size="lg"
          height="120px"
          onClick={onEnter}
        >
          Enter<br />
          Attendance
        </Button>

        <Button
          leftIcon={<FiEye />}
          colorScheme="blue"
          variant="solid"
          size="lg"
          height="120px"
          onClick={onView}
        >
          View<br />
          Attendance
        </Button>

        <Button
          leftIcon={<FiFileText />}
          colorScheme="blue"
          variant="solid"
          size="lg"
          height="120px"
          onClick={onWork}
        >
          Work Done<br />
          Report
        </Button>

        <Button
          leftIcon={<FiBarChart2 />}
          colorScheme="blue"
          variant="solid"
          size="lg"
          height="120px"
          onClick={onViewWork}
        >
          View Work<br />
          Reports
        </Button>
      </Grid>

      {/* Bottom nav */}
      <Flex
        as="nav"
        position="fixed"
        bottom="0"
        left="0"
        width="100%"
        bg="white"
        p={2}
        boxShadow="0 -1px 4px rgba(0,0,0,0.1)"
        justify="space-around"
      >
        <IconButton
          aria-label="Home"
          icon={<FiHome />}
          variant="ghost"
          colorScheme="blue"
          onClick={onEnter}
        />
        <IconButton
          aria-label="Reports"
          icon={<FiBarChart2 />}
          variant="ghost"
          colorScheme="blue"
          onClick={onViewWork}
        />
        <IconButton
          aria-label="Settings"
          icon={<FiSettings />}
          variant="ghost"
          colorScheme="blue"
          onClick={onSettings}
        />
      </Flex>
    </Box>
  )
}