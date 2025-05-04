// src/App.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import MainAttendanceApp from './MainAttendanceApp';
import AdminDashboard from './AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSessionAndUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      if (currentUser) {
        await fetchOrCreateUser(currentUser);
      } else {
        setLoading(false);
      }
    };

    getSessionAndUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        fetchOrCreateUser(currentUser);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const fetchOrCreateUser = async (currentUser) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found — insert with default role
      await supabase.from('users').insert({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.email.split('@')[0],
        role: 'engineer'
      });
      setRole('engineer');
    } else if (data) {
      setRole(data.role);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>;
  if (!user) return <Login setUser={setUser} />;

  if (role === 'admin') return <AdminDashboard user={user} onLogout={handleLogout} />;
  if (role === 'engineer') return <MainAttendanceApp user={user} onLogout={handleLogout} />;

  return <p style={{ padding: 20 }}>Access denied.</p>;
}