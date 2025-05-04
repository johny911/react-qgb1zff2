import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import MainAttendanceApp from './MainAttendanceApp';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <>
      {!user ? (
        <Login setUser={setUser} />
      ) : (
        <MainAttendanceApp user={user} onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
        }} />
      )}
    </>
  );
}