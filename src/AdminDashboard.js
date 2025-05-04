// src/AdminDashboard.js
import React from 'react';

export default function AdminDashboard({ user, onLogout }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Welcome Admin: {user.email}</h2>
      <p>This is your admin dashboard (UI coming soon).</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}