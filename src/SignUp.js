// src/auth/SignUp.js
import React, { useState } from 'react';
import {
  Box, Heading, Text, VStack, FormControl, FormLabel, Input,
  Button, Alert, AlertIcon, AlertTitle, AlertDescription, Link,
} from '@chakra-ui/react';
import { supabase } from '../supabaseClient';

export default function SignUp({ onGoSignIn }) {
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [message,   setMessage]   = useState('');

  const clear = () => { setError(''); setMessage(''); };

  // Create a profile row if we already have a session (email confirmations disabled)
  const ensureProfileRow = async (authUser) => {
    if (!authUser) return;
    const fullName = [authUser.user_metadata?.first_name, authUser.user_metadata?.last_name].filter(Boolean).join(' ').trim() || null;

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('users').insert({
        id: authUser.id,
        email: authUser.email,
        name: fullName,
        role: 'engineer', // default; change if needed
      });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    clear();

    if (!firstName.trim() || !lastName.trim() || !email || !password) {
      setError('Please complete all fields.');
      return;
    }

    setLoading(true);
    try {
      // 1) Soft pre-check using your mirror `public.users` table
      const { data: existing, error: checkErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!checkErr && existing) {
        setError('An account with this email already exists. Please sign in instead.');
        return;
      }

      // 2) Attempt signup (server will also block duplicates)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name:  lastName.trim(),
          },
        },
      });

      if (error) {
        // Friendly message for the common duplication cases
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
          setError('An account with this email already exists. Please sign in.');
        } else {
          setError(error.message);
        }
        return;
      }

      // If confirmation emails are OFF, we might already have a session: seed profile row.
      if (data?.user) await ensureProfileRow(data.user);

      setMessage('Account created! Please check your email to confirm your address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box w="100%" maxW="420px" bg="card" borderRadius="2xl" shadow="md" p={{ base: 6, md: 8 }}>
      <VStack align="stretch" spacing={4}>
        <Heading size="md" textAlign="center">Create your account</Heading>
        <Text textAlign="center" color="textMuted">Use your work email.</Text>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box><AlertTitle fontSize="sm">Couldn’t create account</AlertTitle><AlertDescription fontSize="sm">{error}</AlertDescription></Box>
          </Alert>
        )}
        {message && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Box><AlertTitle fontSize="sm">Check your inbox</AlertTitle><AlertDescription fontSize="sm">{message}</AlertDescription></Box>
          </Alert>
        )}

        <form onSubmit={submit}>
          <VStack align="stretch" spacing={3}>
            <FormControl isRequired>
              <FormLabel mb={1}>First name</FormLabel>
              <Input value={firstName} onChange={(e)=>setFirstName(e.target.value)} placeholder="Johny" bg="white" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel mb={1}>Last name</FormLabel>
              <Input value={lastName} onChange={(e)=>setLastName(e.target.value)} placeholder="Abraham" bg="white" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel mb={1}>Email</FormLabel>
              <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com" bg="white" />
            </FormControl>

            <FormControl isRequired>
              <FormLabel mb={1}>Password</FormLabel>
              <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" bg="white" />
            </FormControl>

            <Button type="submit" colorScheme="brand" size="md" isLoading={loading}>
              Create account
            </Button>

            <Box textAlign="center">
              <Text fontSize="sm">
                Already have an account?{' '}
                <Link color="brand.600" onClick={onGoSignIn}>Sign in</Link>
              </Text>
            </Box>
          </VStack>
        </form>
      </VStack>
    </Box>
  );
}