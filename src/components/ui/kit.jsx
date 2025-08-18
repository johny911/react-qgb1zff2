// src/components/ui/Kit.jsx
import React from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiCheckCircle, FiClipboard, FiHammer, FiEye } from "react-icons/fi";

// Icon map for action buttons
const icons = {
  enter: FiCheckCircle,
  view: FiClipboard,
  work: FiHammer,
  viewWork: FiEye,
};

// Card container with title + optional subtitle
export function SectionCard({ title, subtitle, children }) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderRadius="lg"
      shadow="sm"
      p={4}
    >
      <Heading size="sm">{title}</Heading>
      {subtitle && (
        <Text mt={1} color="textMuted" fontSize="sm">
          {subtitle}
        </Text>
      )}
      <Box mt={4}>{children}</Box>
    </Box>
  );
}

// Primary/outline action button with left icon
export function ActionButton({
  variant = "primary",
  icon = "enter",
  children,
  ...props
}) {
  const Ico = icons[icon] || FiCheckCircle;
  const isPrimary = variant === "primary";
  return (
    <Button
      variant={isPrimary ? "solid" : "outline"}
      colorScheme="brand"
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