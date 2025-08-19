// src/auth/SignIn.js
import React, { useState } from 'react';
import {
  Box, Heading, Text, VStack, HStack, FormControl, FormLabel, Input,
  InputGroup, InputRightElement, Button, Alert, AlertIcon, Link, Divider,
} from '@chakra-ui/react';
import { supabase } from '../supabaseClient';

export default function SignIn({ setUser }) {
  const [view, setView] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [message,   setMessage]   = useState('');

  const resetBanners = () => { setError(''); setMessage(''); };

  // Shared UI bits
  const EmailField = (
    <FormControl isRequired>
      <FormLabel mb={1}>Email</FormLabel>
      <Input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        bg="white"
      />
    </FormControl>
  );

  const PasswordField = (
    <FormControl isRequired>
      <FormLabel mb={1}>Password</FormLabel>
      <InputGroup>
        <Input
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          bg="white"
        />
        <InputRightElement width="4.5rem">
          <Button h="1.75rem" size="sm" variant="ghost" onClick={() => setShowPw((s) => !s)}>
            {showPw ? 'Hide' : 'Show'}
          </Button>
        </InputRightElement>
      </InputGroup>
    </FormControl>
  );

  async function doSignIn(e) {
    e.preventDefault();
    resetBanners();
    if (!email || !password) { setError('Please fill in email and password.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      setUser?.(data.user || null);
    } finally { setLoading(false); }
  }

  async function doSignUp(e) {
    e.preventDefault();
    resetBanners();
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all fields.'); return;
    }
    setLoading(true);
    try {
      // 1) Create auth user (email confirmation will be sent if enabled)
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: `${firstName} ${lastName}` } },
      });
      if (error) {
        // Surface duplicate user nicely
        if ((error.name || error.code || '').toString().includes('user_already_exists')) {
          setError('An account with this email already exists. Please sign in.');
        } else {
          setError(error.message);
        }
        return;
      }

      // 2) If we already have a session (email confirmations off), store name in public.users now
      const authedUser = data.user;
      if (authedUser?.id) {
        const displayName = `${firstName} ${lastName}`.trim();
        await supabase.from('users').upsert(
          { id: authedUser.id, email: authedUser.email, name: displayName },
          { onConflict: 'id' }
        );
      }

      setMessage('Account created! Please check your email to confirm (if required).');
    } finally { setLoading(false); }
  }

  async function doForgot(e) {
    e.preventDefault();
    resetBanners();
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { setError(error.message); return; }
      setMessage('We sent a reset link to your email.');
    } finally { setLoading(false); }
  }

  return (
    <Box
      minH="100vh"
      bg="background"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={10}
    >
      <Box
        w="100%"
        maxW="420px"
        bg="card"
        borderRadius="2xl"
        shadow="md"
        p={{ base: 6, md: 8 }}
      >
        <VStack align="stretch" spacing={4}>
          <Heading size="md" textAlign="center">🏗️ SiteTrack</Heading>
          <Text textAlign="center" color="textMuted">
            {view === 'signin' && 'Sign in to continue'}
            {view === 'signup' && 'Create your account'}
            {view === 'forgot' && 'Reset your password'}
          </Text>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Text fontSize="sm">{error}</Text>
            </Alert>
          )}
          {message && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <Text fontSize="sm">{message}</Text>
            </Alert>
          )}

          {/* VIEW: SIGN IN */}
          {view === 'signin' && (
            <form onSubmit={doSignIn}>
              <VStack align="stretch" spacing={3}>
                {EmailField}
                {PasswordField}
                <Button type="submit" colorScheme="brand" size="md" isLoading={loading}>
                  Continue
                </Button>
                <HStack justify="space-between">
                  <Link
                    color="brand.600"
                    onClick={() => { setView('forgot'); resetBanners(); }}
                  >
                    Forgot password?
                  </Link>
                  <Link
                    color="brand.600"
                    onClick={() => { setView('signup'); resetBanners(); }}
                  >
                    Create account
                  </Link>
                </HStack>
              </VStack>
            </form>
          )}

          {/* VIEW: SIGN UP */}
          {view === 'signup' && (
            <form onSubmit={doSignUp}>
              <VStack align="stretch" spacing={3}>
                <FormControl isRequired>
                  <FormLabel mb={1}>First name</FormLabel>
                  <Input bg="white" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel mb={1}>Last name</FormLabel>
                  <Input bg="white" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </FormControl>
                {EmailField}
                {PasswordField}
                <Button type="submit" colorScheme="brand" size="md" isLoading={loading}>
                  Create account
                </Button>
                <Box textAlign="center">
                  <Link
                    color="brand.600"
                    onClick={() => { setView('signin'); resetBanners(); }}
                  >
                    ← Back to sign in
                  </Link>
                </Box>
              </VStack>
            </form>
          )}

          {/* VIEW: FORGOT */}
          {view === 'forgot' && (
            <form onSubmit={doForgot}>
              <VStack align="stretch" spacing={3}>
                {EmailField}
                <Button type="submit" colorScheme="brand" size="md" isLoading={loading}>
                  Send reset link
                </Button>
                <Box textAlign="center">
                  <Link
                    color="brand.600"
                    onClick={() => { setView('signin'); resetBanners(); }}
                  >
                    ← Back to sign in
                  </Link>
                </Box>
              </VStack>
            </form>
          )}

          <Divider />
          <Text fontSize="xs" color="gray.500" textAlign="center">
            By continuing you agree to the Terms and acknowledge the Privacy Policy.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}