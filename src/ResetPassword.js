// src/ResetPassword.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

function parseHashParams(hash) {
  if (!hash || hash[0] !== '#') return {};
  const params = new URLSearchParams(hash.slice(1));
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    error_description: params.get('error_description'),
  };
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [ready, setReady]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState('');
  const [error, setError]       = useState('');

  useEffect(() => {
    let unsub;
    (async () => {
      try {
        // New PKCE flow (?code=…)
        const url = new URL(window.location.href);
        if (url.searchParams.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession();
          if (error) throw error;
          url.searchParams.delete('code');
          url.searchParams.delete('type');
          window.history.replaceState({}, '', url.pathname);
        }

        // Legacy hash flow (#access_token=…)
        const { access_token, refresh_token, error_description } = parseHashParams(window.location.hash);
        if (error_description) {
          setError(error_description);
          return;
        }
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          window.history.replaceState({}, '', window.location.pathname);
        }

        const { data: { session } } = await supabase.auth.getSession();
        setReady(!!session);

        // Edge case: listen for PASSWORD_RECOVERY
        const listener = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') setReady(true);
        });
        unsub = listener.data.subscription;
      } catch (e) {
        setError(e.message || 'Invalid or expired password reset link.');
      }
    })();
    return () => { try { unsub?.unsubscribe(); } catch {} };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!password) return setError('Please enter a new password.');

    setLoading(true);

    // Safety net: never spin forever
    const safety = setTimeout(() => setLoading(false), 8000);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }

      setMessage('✅ Password updated! Redirecting to login…');
      // Sign out to avoid holding a session with an old token
      await supabase.auth.signOut();

      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (e) {
      setError(e.message || 'Something went wrong while updating your password.');
    } finally {
      clearTimeout(safety);
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Reset Your Password</h2>

      {!ready && !error && <div style={styles.note}>Checking your reset link…</div>}
      {error && <div style={styles.error}>{error}</div>}

      {ready && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            style={styles.input}
            disabled={loading}
          />
          {message && <div style={styles.message}>{message}</div>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Updating…' : 'Set New Password'}
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            style={styles.linkButton}
            disabled={loading}
          >
            ← Back to Login
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
  linkButton: { padding: 10, borderRadius: 8, border: 'none', background: 'transparent', color: '#3b6ef6', fontSize: 14, cursor: 'pointer' },
  error: { color: 'red', fontSize: 14, marginTop: 8 },
  message: { color: 'green', fontSize: 14, marginTop: 8 },
  note: { color: '#555', fontSize: 14, marginTop: 8 },
};