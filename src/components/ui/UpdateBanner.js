// src/components/UpdateBanner.js
import React, { useEffect, useState } from "react";
import { Box, Button, Flex, Text, Slide } from "@chakra-ui/react";

export default function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener("pwa:update-available", handler);
    return () => window.removeEventListener("pwa:update-available", handler);
  }, []);

  if (!show) return null;

  return (
    <Slide direction="bottom" in={show} style={{ zIndex: 1500 }}>
      <Box bg="brand.600" color="white" p={3} shadow="lg">
        <Flex justify="space-between" align="center">
          <Text fontSize="sm">A new version is available</Text>
          <Button
            size="sm"
            colorScheme="whiteAlpha"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </Flex>
      </Box>
    </Slide>
  );
}