// src/ResetPassword.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function parseHashParams(hash) {
  if (!hash || hash[0] !== '#') return {};
  const params = new URLSearchParams(hash.slice(1));
  // Supabase sends tokens in hash for email links
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'), // should be "recovery"
    error_description: params.get('error_description'),
  };
}

export default function ResetPassword() {
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');
  const [ready, setReady]         = useState(false); // page is allowed to reset

  useEffect(() => {
    let unsub;

    (async () => {
      // 1) If the URL hash contains tokens, set the session explicitly.
      const { access_token, refresh_token, type, error_description } = parseHashParams(window.location.hash);

      if (error_description) {
        setError(error_description);
        return;
      }

      if (access_token && refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (setErr) {
          setError(setErr.message);
          return;
        }
        // Clean the URL (remove hash) after we’ve consumed it
        window.history.replaceState({}, '', window.location.pathname);
      }

      // 2) If a session exists, we’re good.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
      }

      // 3) Also listen for the PASSWORD_RECOVERY event (some flows rely on this)
      const listener = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') setReady(true);
      });
      unsub = listener.data.subscription;
    })();

    return () => { try { unsub?.unsubscribe(); } catch {} };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) setError(updateErr.message);
    else setMessage('✅ Password updated! You can now log in.');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Reset Your Password</h2>

      {!ready && !error && (
        <div style={styles.message}>Checking your reset link…</div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {ready && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            disabled={loading}
          />
          {message && <div style={styles.message}>{message}</div>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Updating…' : 'Set New Password'}
          </button>
        </form>
      )}
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
  input: { padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: 16 },
  button: { padding: 12, borderRadius: 8, border: 'none', background: '#3b6ef6', color: '#fff', fontSize: 16, cursor: 'pointer' },
  error: { color: 'red', fontSize: 14, marginTop: 8 },
  message: { color: 'green', fontSize: 14, marginTop: 8 },
};