// App.js
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { FaTrash } from "react-icons/fa";

const supabase = createClient(
  "https://hftkpcltkuewskmtkmbq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmdGtwY2x0a3Vld3NrbXRrbWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMTUxMjYsImV4cCI6MjA2MTY5MTEyNn0.sPBgUfablM1Nh1fX1wBeeYHTL-6rljiDUVqeh4c0t_0" // Replace with your actual anon key
);

export default function App() {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [types, setTypes] = useState({});
  const [rows, setRows] = useState([{ teamId: "", typeId: "", count: "" }]);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [marked, setMarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    checkAttendanceStatus();
  }, [projectId, date]);

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

  async function checkAttendanceStatus() {
    if (!projectId || !date) return;
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("project_id", projectId)
      .eq("date", date);
    if (data?.length) {
      setMarked(true);
      const filled = data.map((item) => ({
        teamId: item.team_id,
        typeId: item.labour_type_id,
        count: item.count,
      }));
      setRows(filled);
    } else {
      setMarked(false);
      setRows([{ teamId: "", typeId: "", count: "" }]);
    }
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
    if (!projectId || !date || rows.some((r) => !r.teamId || !r.typeId || !r.count)) {
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
    if (marked) await supabase.from("attendance").delete().eq("project_id", projectId).eq("date", date);
    const { error } = await supabase.from("attendance").insert(payload);
    setLoading(false);
    if (error) alert("Error: " + error.message);
    else alert("Attendance submitted!");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <h2 style={styles.heading}>👷 SiteTrack</h2>
        <h3>Enter Attendance</h3>
        <select style={styles.input} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Select Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        {marked && <div style={styles.marked}>✅ Attendance marked</div>}

        {rows.map((row, index) => (
          <div key={index} style={styles.rowCard}>
            <select style={styles.input} value={row.teamId} onChange={(e) => handleRowChange(index, "teamId", e.target.value)}>
              <option value="">Select Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              style={styles.input}
              value={row.typeId}
              onChange={(e) => handleRowChange(index, "typeId", e.target.value)}
              disabled={!row.teamId}
            >
              <option value="">Select Labour Type</option>
              {(types[row.teamId] || []).map((type) => (
                <option key={type.id} value={type.id}>{type.type_name}</option>
              ))}
            </select>
            <input
              type="number"
              style={styles.input}
              placeholder="Number of Workers"
              value={row.count}
              onChange={(e) => handleRowChange(index, "count", e.target.value)}
            />
            <button style={styles.deleteBtn} onClick={() => deleteRow(index)}>
              <FaTrash size={14} />
            </button>
          </div>
        ))}

        <button style={styles.outlineBtn} onClick={addRow}>+ Add Team</button>
        <button style={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Submit Attendance"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: '20px',
    background: '#f1f4f9',
    minHeight: '100vh',
    fontFamily: 'sans-serif',
  },
  container: {
    maxWidth: 480,
    margin: 'auto',
  },
  heading: {
    fontWeight: 600,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    borderRadius: 10,
    border: '1px solid #ccc',
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  marked: {
    background: '#e6f4ea',
    color: '#2e7d32',
    padding: '10px 16px',
    borderRadius: 8,
    marginBottom: 16,
  },
  rowCard: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    boxShadow: '0 1px 5px rgba(0,0,0,0.05)',
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    background: '#e53935',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    width: 36,
    height: 36,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  outlineBtn: {
    width: '100%',
    padding: 14,
    fontSize: 16,
    borderRadius: 10,
    border: '2px dashed #2979ff',
    background: '#e3f2fd',
    color: '#1976d2',
    marginBottom: 12,
    cursor: 'pointer',
  },
  submitBtn: {
    width: '100%',
    padding: 14,
    fontSize: 16,
    borderRadius: 10,
    border: 'none',
    background: '#1976d2',
    color: '#fff',
    cursor: 'pointer',
  },
};