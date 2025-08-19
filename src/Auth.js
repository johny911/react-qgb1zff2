// src/Auth.js
import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import SignIn from './auth/SignIn';
import SignUp from './auth/SignUp';
import ResetPassword from './ResetPassword';

export default function Auth({ setUser }) {
  const [screen, setScreen] = useState('signin'); // 'signin' | 'signup' | 'reset'

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
      {screen === 'signin' && (
        <SignIn
          setUser={setUser}
          onGoSignUp={() => setScreen('signup')}
          onGoReset={() => setScreen('reset')}
        />
      )}
      {screen === 'signup' && (
        <SignUp
          onGoSignIn={() => setScreen('signin')}
        />
      )}
      {screen === 'reset' && (
        <ResetPassword />
      )}
    </Box>
  );
}