// ✅ Full App.js with Login/Register + Post-Login UI Working

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hftkpcltkuewskmtkmbq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdGtwY2x0a3Vld3NrbXRrbWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMTUxMjYsImV4cCI6MjA2MTY5MTEyNn0.sPBgUfablM1Nh1fX1wBeeYHTL-6rljiDUVqeh4c0t_0"
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [screen, setScreen] = useState("home");

  // Fetch session on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoadingUser(false);
    });
  }, []);

  const handleLogin = async () => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else setUser(data.user);
  };

  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Registration successful. Please check your email.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loadingUser) return <div style={{ padding: 20 }}>Loading...</div>;

  if (!user) {
    return (
      <div style={styles.authWrapper}>
        <div style={styles.authCard}>
          <h2 style={styles.logo}><span role="img" aria-label="building">🏗️</span> SiteTrack</h2>
          <div style={styles.tabContainer}>
            <button
              style={authScreen === 'login' ? styles.activeTab : styles.inactiveTab}
              onClick={() => setAuthScreen('login')}>Login</button>
            <button
              style={authScreen === 'register' ? styles.activeTab : styles.inactiveTab}
              onClick={() => setAuthScreen('register')}>Register</button>
          </div>
          <div style={styles.formGroup}>
            <input
              style={styles.input}
              placeholder="📧 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="🔒 Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            style={styles.primaryBtn}
            onClick={authScreen === 'login' ? handleLogin : handleRegister}
          >Continue</button>
          {authScreen === 'login' && (
            <p style={styles.linkText}>Forgot Password?</p>
          )}
        </div>
      </div>
    );
  }

  // ✅ Main UI after login
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>👋 Good Morning, {user.email}</h2>
        <button onClick={handleLogout} style={styles.secondaryBtn}>Logout</button>
      </div>

      {screen === 'home' && (
        <div style={{ marginTop: 40 }}>
          <button style={styles.primaryBtn} onClick={() => setScreen('enter')}>➕ Enter Attendance</button>
          <button style={styles.secondaryBtn} onClick={() => setScreen('view')}>👁️ View Attendance</button>
        </div>
      )}

      {screen === 'enter' && (
        <div style={{ marginTop: 20 }}>
          <p>📌 Attendance form will go here...</p>
          <button style={styles.secondaryBtn} onClick={() => setScreen('home')}>🔙 Back</button>
        </div>
      )}

      {screen === 'view' && (
        <div style={{ marginTop: 20 }}>
          <p>📋 Attendance view list will go here...</p>
          <button style={styles.secondaryBtn} onClick={() => setScreen('home')}>🔙 Back</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  authWrapper: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9fafb',
  },
  authCard: {
    background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', width: '90%', maxWidth: '360px', textAlign: 'center',
  },
  logo: {
    marginBottom: '24px', fontSize: '24px', fontWeight: 'bold',
  },
  tabContainer: {
    display: 'flex', marginBottom: '16px',
  },
  activeTab: {
    flex: 1, padding: '12px', background: '#3f51b5', color: '#fff', border: 'none', borderRadius: '10px 0 0 10px', cursor: 'pointer',
  },
  inactiveTab: {
    flex: 1, padding: '12px', background: '#f0f0f0', color: '#444', border: 'none', borderRadius: '0 10px 10px 0', cursor: 'pointer',
  },
  formGroup: {
    display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px',
  },
  input: {
    width: '100%', padding: '12px', fontSize: '16px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box',
  },
  primaryBtn: {
    width: '100%', padding: '14px', fontSize: '16px', borderRadius: '10px', border: 'none', background: '#3f51b5', color: '#fff', marginBottom: '12px', cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 16px', fontSize: '14px', borderRadius: '8px', border: 'none', background: '#666', color: '#fff', marginTop: '12px', cursor: 'pointer',
  },
  linkText: {
    fontSize: '14px', color: '#3f51b5', marginTop: '12px',
  },
};
