import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // or 'register'
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) return setError('Please enter email and password.');

    let res;
    if (mode === 'login') {
      res = await supabase.auth.signInWithPassword({ email, password });
    } else {
      res = await supabase.auth.signUp({ email, password });
    }

    if (res.error) return setError(res.error.message);
    const sessionUser = res.data?.user;
    if (sessionUser) setUser(sessionUser);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.logo}>🏗️ SiteTrack</h1>
      <div style={styles.tab}>
        <button
          style={{ ...styles.tabBtn, ...(mode === 'login' ? styles.active : {}) }}
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button
          style={{ ...styles.tabBtn, ...(mode === 'register' ? styles.active : {}) }}
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" style={styles.button}>
          Continue
        </button>
      </form>

      <a href="#" style={styles.forgot}>Forgot Password?</a>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 360,
    margin: 'auto',
    marginTop: 80,
    padding: 24,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center',
  },
  logo: {
    fontSize: 24,
    marginBottom: 20,
  },
  tab: {
    display: 'flex',
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid #ccc',
  },
  tabBtn: {
    flex: 1,
    padding: 12,
    background: '#f2f2f2',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  active: {
    background: '#3b6ef6',
    color: '#fff',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    border: 'none',
    background: '#3b6ef6',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer',
  },
  forgot: {
    marginTop: 12,
    display: 'inline-block',
    fontSize: 14,
    color: '#3b6ef6',
    textDecoration: 'none',
  },
  error: {
    color: 'red',
    fontSize: 14,
  },
};