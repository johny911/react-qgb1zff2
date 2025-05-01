import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ Your actual Supabase keys
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
      .select(
        "count, labour_types(type_name), labour_teams(name)"
      )
      .eq("project_id", projectId)
      .eq("date", date);

    if (error) {
      alert("Failed to fetch attendance");
    } else {
      setViewResults(data);
    }
    setLoading(false);
  };

  // Render screens
  if (screen === "home") {
    return (
      <div style={{ padding: 20 }}>
        <h2>Labour Attendance</h2>
        <button onClick={() => setScreen("enter")}>➕ Enter Attendance</button>
        <br /><br />
        <button onClick={() => setScreen("view")}>👁️ View Attendance</button>
      </div>
    );
  }

  if (screen === "view") {
    return (
      <div style={{ padding: 20 }}>
        <h2>View Attendance</h2>
        <label>Project:</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">-- Select Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <br /><br />
        <label>Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <br /><br />
        <button onClick={fetchAttendance} disabled={loading}>
          {loading ? "Loading..." : "View Attendance"}
        </button>
        <br /><br />
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
        <br />
        <button onClick={() => setScreen("home")}>🔙 Back</button>
      </div>
    );
  }

  // Default: Enter Attendance
  return (
    <div style={{ padding: 20 }}>
      <h2>Enter Attendance</h2>

      <label>Project Name:</label>
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">-- Select Project --</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <br /><br />

      <label>Date of Attendance:</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

      <br /><br />

      <h4>Labour Teams</h4>
      {rows.map((row, index) => (
        <div key={index} style={{ marginBottom: 10 }}>
          <select
            value={row.teamId}
            onChange={(e) => handleRowChange(index, "teamId", e.target.value)}
          >
            <option value="">-- Select Team --</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>{" "}

          <select
            value={row.typeId}
            onChange={(e) => handleRowChange(index, "typeId", e.target.value)}
            disabled={!row.teamId}
          >
            <option value="">-- Select Type --</option>
            {(types[row.teamId] || []).map((type) => (
              <option key={type.id} value={type.id}>{type.type_name}</option>
            ))}
          </select>{" "}

          <input
            type="number"
            placeholder="Count"
            value={row.count}
            onChange={(e) => handleRowChange(index, "count", e.target.value)}
            style={{ width: 80 }}
          />
        </div>
      ))}

      <button onClick={addRow}>+ Add Team</button>

      <br /><br />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Submitting..." : "Submit Attendance"}
      </button>

      <br /><br />
      <button onClick={() => setScreen("home")}>🔙 Back</button>
    </div>
  );
}