import React, { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email || (mode !== 'forgot' && !password)) {
      return setError('Please fill in all required fields.')
    }

    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) setError(error.message)
      else setUser(data.user)
    } else if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Registration email sent! Check your inbox.')
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) setError(error.message)
      else setMessage('✅ Check your email for the reset link.')
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.logo}>🏗️ SiteTrack</h1>

      {/* only show tabs when not in “forgot” mode */}
      {mode !== 'forgot' && (
        <div style={styles.tab}>
          <button
            style={{
              ...styles.tabBtn,
              ...(mode === 'login' ? styles.active : {}),
            }}
            onClick={() => {
              setMode('login')
              setError('')
              setMessage('')
            }}
          >
            Login
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(mode === 'register' ? styles.active : {}),
            }}
            onClick={() => {
              setMode('register')
              setError('')
              setMessage('')
            }}
          >
            Register
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* only show password field in login/register */}
        {(mode === 'login' || mode === 'register') && (
          <input
            type="password"
            placeholder="Password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.message}>{message}</div>}

        <button type="submit" style={styles.button}>
          {mode === 'login'
            ? 'Continue'
            : mode === 'register'
            ? 'Register'
            : 'Send reset link'}
        </button>
      </form>

      {/* Forgot / Back link */}
      {mode === 'login' && (
        <button
          onClick={() => {
            setMode('forgot')
            setError('')
            setMessage('')
          }}
          style={styles.forgot}
        >
          Forgot Password?
        </button>
      )}
      {mode === 'forgot' && (
        <button
          onClick={() => {
            setMode('login')
            setError('')
            setMessage('')
          }}
          style={styles.forgot}
        >
          ← Back to Login
        </button>
      )}
    </div>
  )
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
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    fontSize: 14,
  },
  message: {
    color: 'green',
    fontSize: 14,
  },
}