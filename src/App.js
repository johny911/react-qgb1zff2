// ✅ Full App.js with Working Login, Enter Attendance & View Attendance Screens

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
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [rows, setRows] = useState([{ teamId: "", typeId: "", count: "" }]);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [viewResults, setViewResults] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoadingUser(false);
    });
    fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    const { data: projectsData } = await supabase.from("projects").select("*");
    const { data: teamsData } = await supabase.from("labour_teams").select("*");
    const { data: typesData } = await supabase.from("labour_types").select("*");
    const typeMap = {};
    typesData.forEach((type) => {
      if (!typeMap[type.team_id]) typeMap[type.team_id] = [];
      typeMap[type.team_id].push(type);
    });
    setProjects(projectsData || []);
    setTeams(teamsData || []);
    setTypes(typeMap);
  };

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

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    if (field === "teamId") updated[index].typeId = "";
    setRows(updated);
  };

  const addRow = () => setRows([...rows, { teamId: "", typeId: "", count: "" }]);

  const deleteRow = (index) => {
    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated.length ? updated : [{ teamId: "", typeId: "", count: "" }]);
  };

  const handleSubmit = async () => {
    if (!projectId || !date || rows.some(r => !r.teamId || !r.typeId || !r.count)) {
      alert("Please fill all fields");
      return;
    }
    const payload = rows.map((row) => ({
      project_id: projectId,
      date,
      team_id: row.teamId,
      labour_type_id: row.typeId,
      count: parseInt(row.count),
    }));
    const { error } = await supabase.from("attendance").insert(payload);
    if (error) alert("Error: " + error.message);
    else {
      alert("Attendance submitted!");
      setRows([{ teamId: "", typeId: "", count: "" }]);
      setShowPreview(false);
      setScreen("home");
    }
  };

  const fetchAttendance = async () => {
    if (!projectId || !date) return alert("Select project and date");
    const { data } = await supabase
      .from("attendance")
      .select("count, labour_types(type_name), labour_teams(name)")
      .eq("project_id", projectId)
      .eq("date", date);
    setViewResults(data || []);
  };

  if (loadingUser) return <div style={{ padding: 20 }}>Loading...</div>;

  if (!user) {
    return (
      <div style={styles.authWrapper}>
        <div style={styles.authCard}>
          <h2 style={styles.logo}><span role="img" aria-label="building">🏗️</span> SiteTrack</h2>
          <div style={styles.tabContainer}>
            <button style={authScreen === 'login' ? styles.activeTab : styles.inactiveTab} onClick={() => setAuthScreen('login')}>Login</button>
            <button style={authScreen === 'register' ? styles.activeTab : styles.inactiveTab} onClick={() => setAuthScreen('register')}>Register</button>
          </div>
          <div style={styles.formGroup}>
            <input style={styles.input} placeholder="📧 Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input style={styles.input} placeholder="🔒 Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button style={styles.primaryBtn} onClick={authScreen === 'login' ? handleLogin : handleRegister}>Continue</button>
          {authScreen === 'login' && <p style={styles.linkText}>Forgot Password?</p>}
        </div>
      </div>
    );
  }

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
          <select style={styles.input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">-- Select Project --</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />

          {rows.map((row, index) => (
            <div key={index} style={{ marginBottom: 16 }}>
              <select style={styles.input} value={row.teamId} onChange={(e) => handleRowChange(index, "teamId", e.target.value)}>
                <option value="">-- Select Team --</option>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <select style={styles.input} value={row.typeId} onChange={(e) => handleRowChange(index, "typeId", e.target.value)} disabled={!row.teamId}>
                <option value="">-- Select Type --</option>
                {(types[row.teamId] || []).map((type) => <option key={type.id} value={type.id}>{type.type_name}</option>)}
              </select>
              <input style={styles.input} type="number" placeholder="No. of Batches" value={row.count} onChange={(e) => handleRowChange(index, "count", e.target.value)} />
              <button style={styles.secondaryBtn} onClick={() => deleteRow(index)}>× Remove</button>
            </div>
          ))}

          <button style={styles.primaryBtn} onClick={addRow}>+ Add Team</button>
          <button style={styles.secondaryBtn} onClick={() => setShowPreview(true)}>👁️ Preview</button>

          {showPreview && (
            <div style={{ marginTop: 16 }}>
              <h4>Summary</h4>
              <ul>
                {rows.map((r, i) => {
                  const team = teams.find(t => t.id == r.teamId)?.name || "Team";
                  const type = types[r.teamId]?.find(t => t.id == r.typeId)?.type_name || "Type";
                  return <li key={i}>{team} – {type} – {r.count} nos</li>;
                })}
              </ul>
              <button style={styles.primaryBtn} onClick={handleSubmit}>✅ Submit</button>
            </div>
          )}

          <button style={styles.secondaryBtn} onClick={() => setScreen('home')}>🔙 Back</button>
        </div>
      )}

      {screen === 'view' && (
        <div style={{ marginTop: 20 }}>
          <select style={styles.input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">-- Select Project --</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
          <button style={styles.primaryBtn} onClick={fetchAttendance}>View</button>

          {viewResults.length > 0 && (
            <ul style={{ marginTop: 16 }}>
              {viewResults.map((r, i) => (
                <li key={i}>{r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos</li>
              ))}
            </ul>
          )}

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
    width: '100%', padding: '12px', fontSize: '16px', borderRadius: '10px', border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: 10,
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