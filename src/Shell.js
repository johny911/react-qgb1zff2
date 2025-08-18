// src/components/Shell.js
import React from 'react'
import { Box } from '@chakra-ui/react'

export default function Shell({ children }) {
  return (
    <Box
      minH="100vh"
      bg="gray.50"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 10 }}
      pb={`calc(env(safe-area-inset-bottom) + 24px)`}
    >
      <Box maxW="560px" mx="auto">
        {children}
      </Box>
    </Box>
  )
}