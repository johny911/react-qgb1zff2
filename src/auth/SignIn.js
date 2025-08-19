// src/auth/SignIn.js
import React, { useState } from 'react';
import {
  Box, Heading, Text, VStack, FormControl, FormLabel, Input,
  InputGroup, InputRightElement, Button, Alert, AlertIcon,
  AlertTitle, AlertDescription, Link,
} from '@chakra-ui/react';
import { supabase } from '../supabaseClient';

export default function SignIn({ setUser, onGoSignUp, onGoReset }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clear = () => { setError(''); setMessage(''); };

  const submit = async (e) => {
    e.preventDefault();
    clear();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else setUser(data.user);
    } finally { setLoading(false); }
  };

  return (
    <Box w="100%" maxW="420px" bg="card" borderRadius="2xl" shadow="md" p={{ base: 6, md: 8 }}>
      <VStack align="stretch" spacing={4}>
        <Heading size="md" textAlign="center">🏗️ SiteTrack</Heading>
        <Text textAlign="center" color="textMuted">Sign in to continue</Text>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box><AlertTitle fontSize="sm">Sign in failed</AlertTitle><AlertDescription fontSize="sm">{error}</AlertDescription></Box>
          </Alert>
        )}
        {message && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Box><AlertTitle fontSize="sm">Done</AlertTitle><AlertDescription fontSize="sm">{message}</AlertDescription></Box>
          </Alert>
        )}

        <form onSubmit={submit}>
          <VStack align="stretch" spacing={3}>
            <FormControl isRequired>
              <FormLabel mb={1}>Email</FormLabel>
              <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com" bg="white" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel mb={1}>Password</FormLabel>
              <InputGroup>
                <Input type={showPw ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" bg="white" />
                <InputRightElement width="4.5rem">
                  <Button h="1.75rem" size="sm" variant="ghost" onClick={()=>setShowPw(s=>!s)}>
                    {showPw ? 'Hide' : 'Show'}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button type="submit" colorScheme="brand" size="md" isLoading={loading}>Continue</Button>

            <Box textAlign="center">
              <Link color="brand.600" onClick={onGoReset}>Forgot password?</Link>
            </Box>
            <Box textAlign="center">
              <Text fontSize="sm">
                New here?{' '}
                <Link color="brand.600" onClick={onGoSignUp}>Create an account</Link>
              </Text>
            </Box>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
}