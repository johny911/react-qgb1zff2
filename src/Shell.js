// src/components/Shell.js
import React from 'react'
import { Box, useColorModeValue } from '@chakra-ui/react'

export default function Shell({ children }) {
  const bg = useColorModeValue('gray.50', 'gray.900')
  return (
    <Box
      minH="100vh"
      bg={bg}
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 10 }}
      // iOS safe-area padding
      pb={`calc(env(safe-area-inset-bottom) + 24px)`}
    >
      <Box maxW="560px" mx="auto">
        {children}
      </Box>
    </Box>
  )
}