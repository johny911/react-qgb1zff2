import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ Your Supabase keys
const SUPABASE_URL = "https://hftkpcltkuewskmtkmbq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdGtwY2x0a3Vld3NrbXRrbWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMTUxMjYsImV4cCI6MjA2MTY5MTEyNn0.sPBgUfablM1Nh1fX1wBeeYHTL-6rljiDUVqeh4c0t_0";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [screen, setScreen] = useState("home"); // home, enter, view
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [rows, setRows] = useState([{ teamId: "", typeId: "", count: "" }]);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [viewResults, setViewResults] = useState([]);

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

  const addRow = () => {
    setRows([...rows, { teamId: "", typeId: "", count: "" }]);
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
    if (error) {
      alert("Error submitting attendance: " + error.message);
    } else {
      alert("Attendance submitted successfully!");
      setRows([{ teamId: "", typeId: "", count: "" }]);
    }
    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!projectId || !date) {
      alert("Select project and date");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance")
      .select("count, labour_types(type_name), labour_teams(name)")
      .eq("project_id", projectId)
      .eq("date", date);

    if (error) {
      alert("Failed to fetch attendance");
    } else {
      setViewResults(data);
    }
    setLoading(false);
  };

  const containerStyle = {
    maxWidth: 500,
    margin: "auto",
    padding: 20,
    fontFamily: "Arial",
  };

  const inputStyle = {
    width: "100%",
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    borderRadius: 6,
    border: "1px solid #ccc",
  };

  const buttonStyle = {
    width: "100%",
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: "#0066cc",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  };

  const backButton = {
    ...buttonStyle,
    backgroundColor: "#666",
  };

  if (screen === "home") {
    return (
      <div style={containerStyle}>
        <h2>Labour Attendance</h2>
        <button style={buttonStyle} onClick={() => setScreen("enter")}>
          ➕ Enter Attendance
        </button>
        <button style={buttonStyle} onClick={() => setScreen("view")}>
          👁️ View Attendance
        </button>
      </div>
    );
  }

  if (screen === "view") {
    return (
      <div style={containerStyle}>
        <h2>View Attendance</h2>
        <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">-- Select Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <button style={buttonStyle} onClick={fetchAttendance} disabled={loading}>
          {loading ? "Loading..." : "View Attendance"}
        </button>

        {viewResults.length > 0 && (
          <div>
            <h4>Results:</h4>
            <ul>
              {viewResults.map((entry, index) => (
                <li key={index}>
                  {entry.labour_teams.name} – {entry.labour_types.type_name} – {entry.count} nos
                </li>
              ))}
            </ul>
          </div>
        )}

        <button style={backButton} onClick={() => setScreen("home")}>🔙 Back</button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2>Enter Attendance</h2>

      <select style={inputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <h4>Labour Teams</h4>
      {rows.map((row, index) => (
        <div key={index} style={{ marginBottom: 15 }}>
          <select
            style={inputStyle}
            value={row.teamId}
            onChange={(e) => handleRowChange(index, "teamId", e.target.value)}
          >
            <option value="">-- Select Team --</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>

          <select
            style={inputStyle}
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
            style={inputStyle}
            type="number"
            placeholder="Count"
            value={row.count}
            onChange={(e) => handleRowChange(index, "count", e.target.value)}
          />
        </div>
      ))}

      <button style={buttonStyle} onClick={addRow}>+ Add Team</button>

      <button style={buttonStyle} onClick={handleSubmit} disabled={loading}>
        {loading ? "Submitting..." : "Submit Attendance"}
      </button>

      <button style={backButton} onClick={() => setScreen("home")}>🔙 Back</button>
    </div>
  );
}