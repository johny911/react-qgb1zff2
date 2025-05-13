// src/components/Shell.js
import React from 'react'
import {
  Box,
  Flex,
  Heading,
  Button,
  useColorMode,
  IconButton,
} from '@chakra-ui/react'
import { SunIcon, MoonIcon } from '@chakra-ui/icons'

export default function Shell({ user, onLogout, children }) {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Flex direction="column" minH="100vh" bg="background">
      {/* header */}
      <Flex
        as="header"
        px={4}
        py={3}
        bg="brand.700"
        color="white"
        align="center"
        justify="space-between"
      >
        <Heading size="md">SiteTrack</Heading>
        <Flex align="center" gap={2}>
          <IconButton
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            aria-label="Toggle color mode"
            onClick={toggleColorMode}
            variant="ghost"
            color="white"
          />
          <Button size="sm" variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </Flex>
      </Flex>

      {/* nav bar */}
      <Flex
        as="nav"
        bg="brand.50"
        px={4}
        py={2}
        gap={2}
        wrap="wrap"
        borderBottom="1px solid"
        borderColor="brand.200"
      >
        <Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'home' }))}>
          Home
        </Button>
        <Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'enter' }))}>
          Enter Attendance
        </Button>
        <Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'view' }))}>
          View Attendance
        </Button>
        <Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'work' }))}>
          Work Report
        </Button>
        <Button variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'view-work' }))}>
          View Reports
        </Button>
      </Flex>

      {/* content */}
      <Box flex="1" p={4}>
        {children}
      </Box>
    </Flex>
  )
}