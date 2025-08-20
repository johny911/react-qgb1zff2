// src/ResetPassword.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [status, setStatus]     = useState({ kind: 'idle', msg: '' }); // idle | error | ok | loading

  // Verify we actually have a recovery session
  useEffect(() => {
    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        setStatus({ kind: 'error', msg: 'Invalid or expired password reset link. Please request a new one.' });
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ kind: 'idle', msg: '' });

    if (!password) {
      return setStatus({ kind: 'error', msg: 'Please enter a new password.' });
    }
    if (password !== confirm) {
      return setStatus({ kind: 'error', msg: 'Passwords do not match.' });
    }

    setStatus({ kind: 'loading', msg: 'Updating password…' });
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus({ kind: 'error', msg: error.message });
    } else {
      setStatus({ kind: 'ok', msg: '✅ Password updated. You can now sign in with your new password.' });
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Reset your password</h2>
      <form onSubmit={submit} style={styles.form}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          autoFocus
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={styles.input}
        />

        {status.kind === 'error' && <div style={styles.error}>{status.msg}</div>}
        {status.kind === 'ok'    && <div style={styles.message}>{status.msg}</div>}
        {status.kind === 'loading' && <div style={styles.message}>{status.msg}</div>}

        <button type="submit" style={styles.button} disabled={status.kind === 'loading'}>
          {status.kind === 'loading' ? 'Updating…' : 'Set new password'}
        </button>
      </form>
      <p style={styles.hint}>
        If this page doesn’t load after clicking the email link, try opening it in your default browser.
      </p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 360,
    margin: '80px auto',
    padding: 24,
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
    textAlign: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  heading: { marginBottom: 16, fontSize: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 16,
  },
  button: {
    padding: 12, borderRadius: 8, border: 'none',
    background: '#3b6ef6', color: '#fff', fontSize: 16, cursor: 'pointer',
  },
  error: { color: 'red', fontSize: 14 },
  message: { color: 'green', fontSize: 14 },
  hint: { marginTop: 12, fontSize: 12, color: '#666' },
};