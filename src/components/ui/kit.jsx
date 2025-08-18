// src/components/ui/Kit.jsx
import React from "react";
import {
  Box, Flex, Heading, Text, Button, Icon, Stack, useColorModeValue,
  Card, CardHeader, CardBody
} from "@chakra-ui/react";
import { CheckCircle, ClipboardList, Hammer, Eye } from "react-feather";

const icons = {
  enter: CheckCircle,
  view: ClipboardList,
  work: Hammer,
  viewWork: Eye,
};

export function SectionCard({ title, subtitle, children }) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.100", "gray.700");
  return (
    <Card bg={bg} border="1px solid" borderColor={border} borderRadius="lg" shadow="sm">
      <CardHeader pb={0}>
        <Heading size="sm">{title}</Heading>
        {subtitle && <Text mt={1} color="textMuted" fontSize="sm">{subtitle}</Text>}
      </CardHeader>
      <CardBody pt={4}>{children}</CardBody>
    </Card>
  );
}

export function PageTitle({ children, right }) {
  return (
    <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={2}>
      <Heading size="md">{children}</Heading>
      {right}
    </Flex>
  );
}

export function ActionButton({ variant="primary", icon="enter", children, ...props }) {
  const Ico = icons[icon] || CheckCircle;
  const variants = {
    primary: { variant: "solid", colorScheme: "brand" },
    outline: { variant: "outline", colorScheme: "brand" },
    subtle:  { variant: "subtle", colorScheme: "gray"  },
  };
  const v = variants[variant] || variants.primary;
  return (
    <Button {...v} leftIcon={<Icon as={Ico} />} justifyContent="flex-start" height="48px" {...props}>
      {children}
    </Button>
  );
}