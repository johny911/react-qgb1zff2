// ✅ Styled Attendance App (with Modern Dropdowns & Marked Status Fix)
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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
  const [viewResults, setViewResults] = useState([]);
  const [marked, setMarked] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (projectId && date) {
      checkMarked();
    }
  }, [projectId, date]);

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

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

  const checkMarked = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("project_id", projectId)
      .eq("date", date);
    setMarked(data && data.length > 0);
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
      alert("Submitted");
      setMarked(true);
      setRows([{ teamId: "", typeId: "", count: "" }]);
      setShowPreview(false);
      setScreen("home");
    }
  };

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("count, labour_types(type_name), labour_teams(name)")
      .eq("project_id", projectId)
      .eq("date", date);
    setViewResults(data || []);
  };

  return (
    <div style={styles.container}>
      {screen === "home" && (
        <div>
          <h2 style={styles.greeting}>Good Morning, {user?.email?.split("@")[0]} 👋</h2>
          <p style={styles.subtext}>Track your site attendance</p>
          <div style={styles.cardButton} onClick={() => setScreen("enter")}>➕ Enter Attendance</div>
          <div style={styles.cardButton} onClick={() => setScreen("view")}>👁️ View Attendance</div>
        </div>
      )}

      {screen === "enter" && (
        <div>
          <h3 style={styles.title}>← Enter Attendance</h3>
          <div style={styles.selectWrapper}>
            <select className="modern-dropdown" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" className="modern-dropdown" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {marked && <div style={styles.marked}>✅ Attendance marked</div>}

          {rows.map((row, index) => (
            <div key={index} style={styles.entryCard}>
              <div style={styles.entryHeader}>
                <strong>Team Entry</strong>
                <button onClick={() => deleteRow(index)} style={styles.trash}>🗑️</button>
              </div>
              <select className="modern-dropdown" value={row.teamId} onChange={(e) => handleRowChange(index, 'teamId', e.target.value)}>
                <option value="">Select Team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select className="modern-dropdown" value={row.typeId} onChange={(e) => handleRowChange(index, 'typeId', e.target.value)} disabled={!row.teamId}>
                <option value="">Select Labor Type</option>
                {(types[row.teamId] || []).map((t) => <option key={t.id} value={t.id}>{t.type_name}</option>)}
              </select>
              <input className="modern-dropdown" type="number" placeholder="Number of Workers" value={row.count} onChange={(e) => handleRowChange(index, 'count', e.target.value)} />
            </div>
          ))}

          <div onClick={addRow} style={styles.dashedBox}>+ Add Team</div>
          <div style={styles.btnRow}>
            <button style={styles.outlineBtn} onClick={() => setShowPreview(true)}>Preview Summary</button>
            <button style={styles.primaryBtn} onClick={handleSubmit}>Submit Attendance</button>
          </div>
          <button style={styles.back} onClick={() => setScreen("home")}>← Back</button>
        </div>
      )}

      {screen === "view" && (
        <div>
          <h3 style={styles.title}>← View Attendance</h3>
          <div style={styles.selectWrapper}>
            <select className="modern-dropdown" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" className="modern-dropdown" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button style={styles.primaryBtn} onClick={fetchAttendance}>View</button>

          {viewResults.map((r, i) => (
            <div key={i} style={styles.viewCard}>
              <div>
                <strong>{r.labour_teams.name}</strong><br />
                {r.labour_types.type_name} – {r.count} nos
              </div>
              <span>👁️</span>
            </div>
          ))}

          <button style={styles.back} onClick={() => setScreen("home")}>← Back</button>
        </div>
      )}

      <style>{`
        .modern-dropdown {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #ccc;
          margin-bottom: 12px;
          font-size: 16px;
          appearance: none;
          background: #fff;
        }
        input[type='date']::-webkit-calendar-picker-indicator {
          filter: brightness(0.3);
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { padding: 20, fontFamily: 'system-ui, sans-serif', background: '#f5f6fa', minHeight: '100vh' },
  greeting: { fontWeight: 'bold', fontSize: 20 },
  subtext: { color: '#666', marginBottom: 24 },
  cardButton: { background: '#fff', padding: 20, borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 16, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 },
  title: { fontWeight: 600, marginBottom: 16 },
  selectWrapper: { display: 'flex', flexDirection: 'column', gap: 10 },
  marked: { background: '#e0f8e9', color: '#2e7d32', padding: 12, borderRadius: 10, marginBottom: 12 },
  entryCard: { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 16 },
  entryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trash: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
  dashedBox: { border: '2px dashed #3f51b5', padding: 16, borderRadius: 12, textAlign: 'center', color: '#3f51b5', fontWeight: 500, marginBottom: 20, cursor: 'pointer' },
  btnRow: { display: 'flex', gap: 10 },
  primaryBtn: { flex: 1, background: '#3f51b5', color: '#fff', padding: 14, border: 'none', borderRadius: 10, cursor: 'pointer' },
  outlineBtn: { flex: 1, background: '#fff', border: '1px solid #ccc', padding: 14, borderRadius: 10, cursor: 'pointer' },
  back: { marginTop: 20, color: '#3f51b5', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' },
  viewCard: { background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }
};
