// ✅ Full App with Supabase Auth, Attendance Edit Check, and Preview Summary

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
  const [isEditMode, setIsEditMode] = useState(false);
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
    const { error, data } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Registration successful, please check your email to confirm.");
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

  const checkExistingAttendance = async () => {
    if (!projectId || !date) return;
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("project_id", projectId)
      .eq("date", date);

    if (data && data.length > 0) {
      const confirmEdit = window.confirm("Attendance has already been marked. Do you want to edit it?");
      if (confirmEdit) {
        setIsEditMode(true);
        setExistingAttendanceIds(data.map((entry) => entry.id));
        const formatted = data.map((entry) => ({
          teamId: entry.team_id,
          typeId: entry.labour_type_id,
          count: entry.count.toString(),
        }));
        setRows(formatted);
      } else {
        setScreen("home");
      }
    } else {
      setIsEditMode(false);
      setRows([{ teamId: "", typeId: "", count: "" }]);
    }
  };

  const handleSubmit = async () => {
    if (!projectId || !date || rows.some(r => !r.teamId || !r.typeId || !r.count)) {
      alert("Please fill all fields");
      return;
    }
    setLoading(true);

    if (isEditMode && existingAttendanceIds.length > 0) {
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
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>{authScreen === "login" ? "Login" : "Register"}</h2>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
        <button style={styles.primaryBtn} onClick={authScreen === "login" ? handleLogin : handleRegister}>
          {authScreen === "login" ? "Login" : "Register"}
        </button>
        <button style={styles.secondaryBtn} onClick={() => setAuthScreen(authScreen === "login" ? "register" : "login")}>
          {authScreen === "login" ? "Create Account" : "Back to Login"}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h3 style={{ margin: 0 }}>{greeting()}, {user.email.split("@")[0]} 👋</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>Welcome to the Attendance App</p>
        </div>
        <div style={{ position: "relative" }}>
          <FaUserCircle size={36} color="#444" onClick={() => setShowProfile(!showProfile)} style={{ cursor: "pointer" }} />
          {showProfile && (
            <div style={{ position: "absolute", top: 40, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontWeight: "bold" }}>{user.email}</p>
              <button style={{ marginTop: 8, ...styles.secondaryBtn }} onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.container}>
        {screen === "home" && (
          <div className="fade-in" style={styles.card}>
            <h2 style={styles.heading}>Labour Attendance</h2>
            <button style={styles.primaryBtn} onClick={() => { setScreen("enter"); checkExistingAttendance(); }}>➕ Enter Attendance</button>
            <button style={styles.secondaryBtn} onClick={() => setScreen("view")}>👁️ View Attendance</button>
          </div>
        )}

        {screen === "enter" && (
          <div style={styles.card}>
            <h3>{isEditMode ? "Edit Attendance" : "Enter Attendance"}</h3>
            <select style={styles.input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">-- Select Project --</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
            {rows.map((row, index) => (
              <div key={index} style={styles.rowCard}>
                <button style={styles.deleteBtn} onClick={() => deleteRow(index)}>×</button>
                <select style={styles.input} value={row.teamId} onChange={(e) => handleRowChange(index, "teamId", e.target.value)}>
                  <option value="">-- Select Team --</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
                <select style={styles.input} value={row.typeId} onChange={(e) => handleRowChange(index, "typeId", e.target.value)} disabled={!row.teamId}>
                  <option value="">-- Select Type --</option>
                  {(types[row.teamId] || []).map((type) => (
                    <option key={type.id} value={type.id}>{type.type_name}</option>
                  ))}
                </select>
                <input style={styles.input} type="number" placeholder="No. of Batches" value={row.count} onChange={(e) => handleRowChange(index, "count", e.target.value)} />
              </div>
            ))}
            <button style={styles.primaryBtn} onClick={addRow}>+ Add Team</button>
            <button style={styles.secondaryBtn} onClick={() => setShowPreview(true)}>👁️ Preview Summary</button>
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
                <button style={styles.successBtn} onClick={handleSubmit}>✅ Submit Attendance</button>
              </div>
            )}
            <button style={styles.secondaryBtn} onClick={() => setScreen("home")}>🔙 Back</button>
          </div>
        )}

        {screen === "view" && (
          <div style={styles.card}>
            <h3>View Attendance</h3>
            <select style={styles.input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">-- Select Project --</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
            <button style={styles.primaryBtn} onClick={fetchAttendance}>View</button>
            {viewResults.length > 0 && (
              <ul>
                {viewResults.map((r, i) => (
                  <li key={i}>{r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos</li>
                ))}
              </ul>
            )}
            <button style={styles.secondaryBtn} onClick={() => setScreen("home")}>🔙 Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { width: "100vw", overflowX: "hidden", background: "#f9fafe", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", borderBottom: "1px solid #eee", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" },
  container: { width: "100%", maxWidth: "100%", margin: "0 auto", padding: "16px", fontFamily: "system-ui, sans-serif" },
  card: { background: "#fff", borderRadius: "14px", padding: "20px 16px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  heading: { textAlign: "center", marginBottom: 24 },
  input: { width: "100%", padding: "12px", fontSize: "16px", borderRadius: "10px", border: "1px solid #ccc", marginBottom: "12px", boxSizing: "border-box" },
  rowCard: { background: "#fafafa", border: "1px solid #ddd", borderRadius: "12px", padding: "16px", marginBottom: "16px", position: "relative", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" },
  deleteBtn: { position: "absolute", top: 10, right: 10, background: "#d32f2f", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, fontWeight: "bold", cursor: "pointer" },
  primaryBtn: { width: "100%", padding: "14px", fontSize: "16px", borderRadius: "10px", border: "none", background: "#1976d2", color: "#fff", marginBottom: "12px", cursor: "pointer" },
  successBtn: { width: "100%", padding: "14px", fontSize: "16px", borderRadius: "10px", border: "none", background: "#2e7d32", color: "#fff", marginBottom: "12px", cursor: "pointer" },
  secondaryBtn: { width: "100%", padding: "14px", fontSize: "16px", borderRadius: "10px", border: "none", background: "#666", color: "#fff", marginBottom: "12px", cursor: "pointer" },
};
