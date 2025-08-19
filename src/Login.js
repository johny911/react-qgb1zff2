// src/Login.js
import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Link,
  Divider,
  VStack,
} from '@chakra-ui/react';
import { supabase } from './supabaseClient';

export default function Login({ setUser }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');   // NEW
  const [lastName, setLastName] = useState('');     // NEW
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clearBanners = () => {
    setError('');
    setMessage('');
  };

  // Ensure public.users has a row for this auth user (and keep the name fresh)
  const ensureProfileRow = async (authUser) => {
    if (!authUser) return;

    const metaFirst = authUser.user_metadata?.first_name || '';
    const metaLast  = authUser.user_metadata?.last_name || '';
    const fullName  = [metaFirst, metaLast].filter(Boolean).join(' ').trim() || null;

    // Try to fetch an existing row
    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', authUser.id)
      .maybeSingle();

    if (fetchErr) {
      // Non-blocking for login; just surface a banner
      setMessage('Logged in, but profile sync had a small hiccup.');
      return;
    }

    if (!existing) {
      // Insert with a sensible default role; adjust if you prefer a different default
      await supabase.from('users').insert({
        id: authUser.id,
        email: authUser.email,
        name: fullName,
        role: 'engineer',
      });
    } else {
      // Keep email + name up-to-date (do not touch role here)
      const updates = {};
      if (authUser.email && authUser.email !== existing.email) updates.email = authUser.email;
      if (fullName && fullName !== existing.name) updates.name = fullName;
      if (Object.keys(updates).length) {
        await supabase.from('users').update(updates).eq('id', authUser.id);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearBanners();

    const needPw = mode !== 'forgot';
    if (!email || (needPw && !password)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'register' && (!firstName.trim() || !lastName.trim())) {
      setError('Please enter your first and last name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
        } else {
          // Make sure profile exists/updated, then pass user upward
          await ensureProfileRow(data.user);
          setUser(data.user);
        }
      } else if (mode === 'register') {
        // Pass name into user_metadata so we can greet them later
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });

        if (error) {
          setError(error.message);
        } else {
          // If email confirmation is OFF, a session may already exist => upsert now
          if (data?.user) {
            await ensureProfileRow(data.user);
          }
          setMessage('Registration email sent! Check your inbox to confirm your account.');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setError(error.message);
        else setMessage('Check your email for the reset link.');
      }
    } finally {
      setLoading(false);
    }
  };

  const EmailInput = (
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

  const PasswordInput = (
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
          <Button
            h="1.75rem"
            size="sm"
            variant="ghost"
            onClick={() => setShowPw((s) => !s)}
          >
            {showPw ? 'Hide' : 'Show'}
          </Button>
        </InputRightElement>
      </InputGroup>
    </FormControl>
  );

  // First/Last name inputs (register only)
  const NameInputs = (
    <>
      <FormControl isRequired>
        <FormLabel mb={1}>First name</FormLabel>
        <Input
          placeholder="Johny"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          bg="white"
        />
      </FormControl>
      <FormControl isRequired>
        <FormLabel mb={1}>Last name</FormLabel>
        <Input
          placeholder="Abraham"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          bg="white"
        />
      </FormControl>
    </>
  );

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
          <Heading size="md" textAlign="center">
            🏗️ SiteTrack
          </Heading>
          <Text textAlign="center" color="textMuted">
            Sign in to continue
          </Text>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Something went wrong</AlertTitle>
                <AlertDescription fontSize="sm">{error}</AlertDescription>
              </Box>
            </Alert>
          )}

          {message && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Done</AlertTitle>
                <AlertDescription fontSize="sm">{message}</AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Tabs for Login/Register; Forgot is a separate simple panel */}
          {mode !== 'forgot' ? (
            <Tabs
              variant="soft-rounded"
              colorScheme="brand"
              index={mode === 'login' ? 0 : 1}
              onChange={(i) => {
                setMode(i === 0 ? 'login' : 'register');
                clearBanners();
              }}
              isFitted
            >
              <TabList bg="gray.100" p="1" borderRadius="lg">
                <Tab>Login</Tab>
                <Tab>Register</Tab>
              </TabList>
              <TabPanels mt={3}>
                {/* LOGIN */}
                <TabPanel px={0}>
                  <form onSubmit={handleSubmit}>
                    <VStack align="stretch" spacing={3}>
                      {EmailInput}
                      {PasswordInput}
                      <Button
                        type="submit"
                        colorScheme="brand"
                        size="md"
                        isLoading={loading}
                      >
                        Continue
                      </Button>
                      <Box textAlign="center">
                        <Link
                          color="brand.600"
                          onClick={() => {
                            setMode('forgot');
                            clearBanners();
                          }}
                        >
                          Forgot password?
                        </Link>
                      </Box>
                    </VStack>
                  </form>
                </TabPanel>

                {/* REGISTER */}
                <TabPanel px={0}>
                  <form onSubmit={handleSubmit}>
                    <VStack align="stretch" spacing={3}>
                      {NameInputs}
                      {EmailInput}
                      {PasswordInput}
                      <Button
                        type="submit"
                        colorScheme="brand"
                        size="md"
                        isLoading={loading}
                      >
                        Create account
                      </Button>
                    </VStack>
                  </form>
                </TabPanel>
              </TabPanels>
            </Tabs>
          ) : (
            // FORGOT PASSWORD PANEL
            <Box>
              <Heading size="sm" mb={2}>
                Reset your password
              </Heading>
              <Text fontSize="sm" color="textMuted" mb={3}>
                Enter your email and we’ll send you a reset link.
              </Text>
              <form onSubmit={handleSubmit}>
                <VStack align="stretch" spacing={3}>
                  {EmailInput}
                  <Button
                    type="submit"
                    colorScheme="brand"
                    size="md"
                    isLoading={loading}
                  >
                    Send reset link
                  </Button>
                  <Box textAlign="center">
                    <Link
                      color="brand.600"
                      onClick={() => {
                        setMode('login');
                        clearBanners();
                      }}
                    >
                      ← Back to login
                    </Link>
                  </Box>
                </VStack>
              </form>
            </Box>
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