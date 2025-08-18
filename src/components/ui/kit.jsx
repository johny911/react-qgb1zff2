// src/MainAttendanceApp.js
import React from "react";
import {
  ChakraProvider,
  Box,
  Heading,
  Text,
  Button,
  Icon,
  VStack,
  useColorModeValue,
  extendTheme,
} from "@chakra-ui/react";
import { FiCheckCircle, FiClipboard, FiHammer, FiEye, FiLogOut } from "react-icons/fi";

// ——— Minimal inline UI helpers (no extra files) ———
const _icons = { enter: FiCheckCircle, view: FiClipboard, work: FiHammer, viewWork: FiEye };

function SectionCard({ title, subtitle, children }) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  return (
    <Box bg={bg} border="1px solid" borderColor={border} borderRadius="lg" shadow="sm" p={4}>
      <Heading size="sm">{title}</Heading>
      {subtitle && (
        <Text mt={1} color="gray.500" fontSize="sm">
          {subtitle}
        </Text>
      )}
      <Box mt={4}>{children}</Box>
    </Box>
  );
}

function ActionButton({ variant = "primary", icon = "enter", children, ...props }) {
  const Ico = _icons[icon] || FiCheckCircle;
  const isPrimary = variant === "primary";
  return (
    <Button
      variant={isPrimary ? "solid" : "outline"}
      colorScheme="blue"
      leftIcon={<Icon as={Ico} boxSize={5} />}
      justifyContent="flex-start"
      height="48px"
      width="100%"
      {...props}
    >
      {children}
    </Button>
  );
}

// ——— Main App ———
export default function MainAttendanceApp() {
  const bg = useColorModeValue("gray.50", "gray.900");

  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg={bg} p={6}>
        <VStack spacing={6} align="stretch" maxW="md" mx="auto">
          {/* Header */}
          <Box textAlign="center">
            <Heading size="lg" color="blue.600">
              SiteTrack
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Welcome, johnyabraham8056
            </Text>
          </Box>

          {/* Actions */}
          <SectionCard title="Quick Actions" subtitle="Manage site attendance and reports">
            <VStack spacing={3} align="stretch">
              <ActionButton icon="enter" onClick={() => alert("Enter Attendance")}>
                Enter Attendance
              </ActionButton>
              <ActionButton icon="view" variant="outline" onClick={() => alert("View Attendance")}>
                View Attendance
              </ActionButton>
              <ActionButton icon="work" onClick={() => alert("Work Done Report")}>
                Work Done Report
              </ActionButton>
              <ActionButton
                icon="viewWork"
                variant="outline"
                onClick={() => alert("View Work Done Report")}
              >
                View Work Done Report
              </ActionButton>
            </VStack>
          </SectionCard>

          {/* Logout */}
          <Button
            leftIcon={<FiLogOut />}
            colorScheme="red"
            variant="ghost"
            alignSelf="center"
            onClick={() => alert("Logout")}
          >
            Logout
          </Button>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

// ——— Custom theme (optional tweaks) ———
const theme = extendTheme({
  fonts: {
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
  },
  colors: {
    blue: {
      600: "#2563eb",
    },
  },
});