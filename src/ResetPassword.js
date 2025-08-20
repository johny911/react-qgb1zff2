// src/ResetPassword.js
import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Verify session exists (password recovery link)
  useEffect(() => {
    ;(async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        setError('Invalid or expired password reset link.')
      }
    })()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!password) {
      return setError('Please enter a new password.')
    }
    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateErr) {
      setError(updateErr.message)
    } else {
      setMessage('✅ Password successfully updated! You can now log in.')
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Reset Your Password</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
        {error && <div style={styles.error}>{error}</div>}
        {message && <div style={styles.message}>{message}</div>}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Updating…' : 'Set New Password'}
        </button>
      </form>
    </div>
  )
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
  heading: {
    marginBottom: 16,
    fontSize: 20,
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
  error: {
    color: 'red',
    fontSize: 14,
  },
  message: {
    color: 'green',
    fontSize: 14,
  },
}
