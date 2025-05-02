import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hftkpcltkuewskmtkmbq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
);

export default function App() {
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

  useEffect(() => {
    fetchBaseData();
  }, []);

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

    setLoading(true);
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

  // --- STYLES ---
  const outerWrap = {
    width: "100vw",
    overflowX: "hidden",
    minHeight: "100vh",
    background: "#f2f4f8",
    padding: "20px 10px",
    boxSizing: "border-box",
  };

  const container = {
    maxWidth: "480px",
    margin: "auto",
    fontFamily: "system-ui, sans-serif",
  };

  const card = {
    background: "#fff",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: "20px",
  };

  const input = {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    marginBottom: "12px",
    boxSizing: "border-box",
  };

  const button = {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    marginBottom: "12px",
  };

  const primary = { ...button, background: "#1976d2", color: "#fff" };
  const success = { ...button, background: "#2e7d32", color: "#fff" };
  const danger = { ...button, background: "#d32f2f", color: "#fff" };
  const gray = { ...button, background: "#757575", color: "#fff" };

  const rowCard = {
    ...card,
    position: "relative",
    paddingBottom: "10px",
  };

  const deleteBtn = {
    position: "absolute",
    top: 10,
    right: 10,
    background: "#e53935",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 28,
    height: 28,
    fontWeight: "bold",
    cursor: "pointer"
  };

  // --- SCREENS ---
  if (screen === "home") {
    return (
      <div style={outerWrap}>
        <div style={container}>
          <div style={card}>
            <h2 style={{ textAlign: "center" }}>Labour Attendance</h2>
            <button style={primary} onClick={() => setScreen("enter")}>➕ Enter Attendance</button>
            <button style={gray} onClick={() => setScreen("view")}>👁️ View Attendance</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "view") {
    return (
      <div style={outerWrap}>
        <div style={container}>
          <div style={card}>
            <h3>View Attendance</h3>
            <select style={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">-- Select Project --</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
            <button style={primary} onClick={fetchAttendance}>View</button>
            {viewResults.length > 0 && (
              <ul>
                {viewResults.map((r, i) => (
                  <li key={i}>{r.labour_teams.name} – {r.labour_types.type_name} – {r.count} nos</li>
                ))}
              </ul>
            )}
            <button style={gray} onClick={() => setScreen("home")}>🔙 Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={outerWrap}>
      <div style={container}>
        <div style={card}>
          <h3>Enter Attendance</h3>
          <select style={input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">-- Select Project --</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />

          {rows.map((row, index) => (
            <div key={index} style={rowCard}>
              <button onClick={() => deleteRow(index)} style={deleteBtn}>×</button>
              <select style={input} value={row.teamId} onChange={(e) => handleRowChange(index, "teamId", e.target.value)}>
                <option value="">-- Select Team --</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <select
                style={input}
                value={row.typeId}
                onChange={(e) => handleRowChange(index, "typeId", e.target.value)}
                disabled={!row.teamId}
              >
                <option value="">-- Select Type --</option>
                {(types[row.teamId] || []).map((type) => (
                  <option key={type.id} value={type.id}>{type.type_name}</option>
                ))}
              </select>
              <input
                style={input}
                type="number"
                placeholder="No. of Batches"
                value={row.count}
                onChange={(e) => handleRowChange(index, "count", e.target.value)}
              />
            </div>
          ))}

          <button style={primary} onClick={addRow}>+ Add Team</button>
          <button style={gray} onClick={() => setShowPreview(true)}>👁️ Preview Summary</button>

          {showPreview && (
            <div style={{ marginTop: 20 }}>
              <h4>Summary</h4>
              <ul>
                {rows.map((r, i) => {
                  const team = teams.find(t => t.id == r.teamId)?.name || "Team";
                  const type = types[r.teamId]?.find(t => t.id == r.typeId)?.type_name || "Type";
                  return <li key={i}>{team} – {type} – {r.count} nos</li>;
                })}
              </ul>
              <button style={success} onClick={handleSubmit}>✅ Submit Attendance</button>
            </div>
          )}

          <button style={gray} onClick={() => setScreen("home")}>🔙 Back</button>
        </div>
      </div>
    </div>
  );
}