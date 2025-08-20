// src/ResetPassword.js
import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  IconButton,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
} from '@chakra-ui/react';
import { supabase } from './supabaseClient';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

export default function ResetPassword() {
  const toast = useToast();
  const [sessionOk, setSessionOk] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [showCp, setShowCp]     = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [fatalError, setFatalError] = useState('');   // invalid/expired link
  const [successMsg, setSuccessMsg] = useState('');   // success state

  // Check the recovery session provided by Supabase magic link
  useEffect(() => {
    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        setFatalError('This password reset link is invalid or has expired. Please request a new link.');
        setSessionOk(false);
      } else {
        setSessionOk(true);
      }
    })();
  }, []);

  const validate = () => {
    if (!password || !confirm) return 'Please fill both fields.';
    if (password.length < 8)   return 'Password must be at least 8 characters.';
    if (password !== confirm)  return 'Passwords do not match.';
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setFatalError('');

    const err = validate();
    if (err) {
      toast({ title: 'Check your input', description: err, status: 'warning' });
      return;
    }

    setSubmitting(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateErr) {
      toast({ title: 'Could not update password', description: updateErr.message, status: 'error' });
      return;
    }

    setSuccessMsg('Your password has been updated successfully.');
    toast({ title: 'Password updated', status: 'success' });
  };

  const goToLogin = async () => {
    // Sign out so the user logs in with the new password cleanly
    try { await supabase.auth.signOut(); } catch {}
    window.location.replace('/');
  };

  const goHome = () => {
    // If they’re already signed in by the recovery session, let them go back to the app
    window.location.replace('/');
  };

  return (
    <Box
      bg="white"
      borderRadius="2xl"
      shadow="md"
      p={{ base: 6, md: 8 }}
      maxW="480px"
      mx="auto"
      mt={{ base: 10, md: 16 }}
    >
      <VStack align="stretch" spacing={4}>
        <Heading size="md" textAlign="center">Reset your password</Heading>
        <Text fontSize="sm" color="gray.600" textAlign="center">
          Enter a new password for your account.
        </Text>

        {/* Fatal error (expired/invalid link) */}
        {fatalError && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Invalid or expired link</AlertTitle>
              <AlertDescription>{fatalError}</AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Success state */}
        {successMsg && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Password updated</AlertTitle>
              <AlertDescription>
                {successMsg} You can now sign in with your new password.
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Form */}
        {!fatalError && (
          <form onSubmit={onSubmit}>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired isDisabled={!sessionOk || !!successMsg}>
                <FormLabel>New password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      size="sm"
                      variant="ghost"
                      icon={showPw ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowPw((v) => !v)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl isRequired isDisabled={!sessionOk || !!successMsg}>
                <FormLabel>Confirm password</FormLabel>
                <InputGroup>
                  <Input
                    type={showCp ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showCp ? 'Hide password' : 'Show password'}
                      size="sm"
                      variant="ghost"
                      icon={showCp ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowCp((v) => !v)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              {!successMsg ? (
                <Button
                  type="submit"
                  colorScheme="brand"
                  isLoading={submitting}
                  isDisabled={!sessionOk}
                >
                  Set new password
                </Button>
              ) : (
                <VStack spacing={2} align="stretch">
                  <Button colorScheme="brand" onClick={goHome}>
                    Return to app
                  </Button>
                  <Button variant="outline" onClick={goToLogin}>
                    Go to login
                  </Button>
                </VStack>
              )}
            </VStack>
          </form>
        )}

        {/* Helper when link is invalid */}
        {fatalError && (
          <VStack spacing={2}>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Go back to the login screen and use “Forgot Password” to request a new link.
            </Text>
            <Button onClick={() => window.location.replace('/')} variant="outline">
              Back to login
            </Button>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}