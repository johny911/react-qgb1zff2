// ✅ Full App with Styled Login/Register (SiteTrack Style)

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { FaUserCircle } from "react-icons/fa";

const supabase = createClient(
  "https://hftkpcltkuewskmtkmbq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdGtwY2x0a3Vld3NrbXRrbWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMTUxMjYsImV4cCI6MjA2MTY5MTEyNn0.sPBgUfablM1Nh1fX1wBeeYHTL-6rljiDUVqeh4c0t_0"
);

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [rows, setRows] = useState([{ teamId: "", typeId: "", count: "" }]);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [viewResults, setViewResults] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [authScreen, setAuthScreen] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isMarked, setIsMarked] = useState(false);
  const [existingAttendanceIds, setExistingAttendanceIds] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    fetchBaseData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  async function fetchBaseData() {
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
  }

  const handleLogin = async () => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else setUser(data.user);
  };

  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Registration successful. Please check your email to confirm.");
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

  const checkAttendanceStatus = async (projId, selectedDate) => {
    if (!projId || !selectedDate) return;
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("project_id", projId)
      .eq("date", selectedDate);
    if (data && data.length > 0) {
      setIsMarked(true);
      setExistingAttendanceIds(data.map((d) => d.id));
    } else {
      setIsMarked(false);
      setExistingAttendanceIds([]);
    }
  };

  const loadAttendanceForEdit = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("project_id", projectId)
      .eq("date", date);
    const formatted = data.map((entry) => ({
      teamId: entry.team_id,
      typeId: entry.labour_type_id,
      count: entry.count.toString(),
    }));
    setRows(formatted);
  };

  const handleSubmit = async () => {
    if (!projectId || !date || rows.some(r => !r.teamId || !r.typeId || !r.count)) {
      alert("Please fill all fields");
      return;
    }
    setLoading(true);
    if (isMarked && existingAttendanceIds.length > 0) {
      await supabase.from("attendance").delete().in("id", existingAttendanceIds);
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
    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!projectId || !date) return alert("Select project and date");
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("count, labour_types(type_name), labour_teams(name)")
      .eq("project_id", projectId)
      .eq("date", date);
    setViewResults(data || []);
    setLoading(false);
  };

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

  // (rest of your app with dashboard, enter/view attendance, profile menu...)
}

const styles = {
  authWrapper: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif',
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
  linkText: {
    fontSize: '14px', color: '#3f51b5', marginTop: '12px',
  },
};
