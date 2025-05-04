// ✅ Attendance App with react-select Dropdowns
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Select from "react-select";

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
  const [projectId, setProjectId] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [viewResults, setViewResults] = useState([]);
  const [marked, setMarked] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchBaseData();
  }, []);

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
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

  useEffect(() => {
    if (projectId && date) {
      checkMarked();
    }
  }, [projectId, date]);

  const checkMarked = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("project_id", projectId.value)
      .eq("date", date);

    if (data && data.length > 0) {
      setMarked(true);
      setExistingAttendance(data);
      const mapped = data.map((item) => ({
        teamId: item.team_id,
        typeId: item.labour_type_id,
        count: item.count.toString(),
      }));
      setRows(mapped);
    } else {
      setMarked(false);
      setRows([{ teamId: "", typeId: "", count: "" }]);
    }
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
    await supabase
      .from("attendance")
      .delete()
      .eq("project_id", projectId.value)
      .eq("date", date);

    const payload = rows.map((row) => ({
      project_id: projectId.value,
      date,
      team_id: row.teamId,
      labour_type_id: row.typeId,
      count: parseInt(row.count),
    }));

    const { error } = await supabase.from("attendance").insert(payload);
    if (error) alert("Error: " + error.message);
    else {
      alert("Attendance saved!");
      setMarked(true);
      setShowPreview(false);
      setScreen("home");
    }
  };

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("count, labour_types(type_name), labour_teams(name)")
      .eq("project_id", projectId.value)
      .eq("date", date);
    setViewResults(data || []);
  };

  const projectOptions = projects.map(p => ({ label: p.name, value: p.id }));
  const teamOptions = teams.map(t => ({ label: t.name, value: t.id }));

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', background: '#f5f6fa', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontWeight: 'bold', fontSize: 18 }}>👷 SiteTrack</h2>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{user.email?.split('@')[0]}</span>
            <button onClick={logout} style={{ background: '#eee', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer' }}>🚪</button>
          </div>
        )}
      </div>

      {screen === "enter" && (
        <>
          <h3>Enter Attendance</h3>
          <Select
            options={projectOptions}
            value={projectId}
            onChange={(selected) => setProjectId(selected)}
            placeholder="Select Project"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ ...inputStyle, marginTop: 10 }}
          />

          {rows.map((row, index) => {
            const teamSelectOptions = teams.map(t => ({ label: t.name, value: t.id }));
            const typeOptions = types[row.teamId] || [];
            return (
              <div key={index} style={cardStyle}>
                <Select
                  options={teamSelectOptions}
                  value={teamSelectOptions.find(opt => opt.value === row.teamId)}
                  onChange={(selected) => handleRowChange(index, "teamId", selected.value)}
                  placeholder="Select Team"
                />
                <Select
                  options={(typeOptions || []).map(t => ({ label: t.type_name, value: t.id }))}
                  value={(typeOptions || []).map(t => ({ label: t.type_name, value: t.id })).find(opt => opt.value === row.typeId)}
                  onChange={(selected) => handleRowChange(index, "typeId", selected.value)}
                  placeholder="Select Labour Type"
                  isDisabled={!row.teamId}
                />
                <input
                  type="number"
                  value={row.count}
                  onChange={(e) => handleRowChange(index, "count", e.target.value)}
                  placeholder="Number of Workers"
                  style={inputStyle}
                />
                <button onClick={() => deleteRow(index)} style={deleteBtn}>🗑️</button>
              </div>
            );
          })}

          <button onClick={addRow} style={addBtn}>+ Add Team</button>
          <button onClick={() => setShowPreview(true)} style={btnSecondary}>Preview Summary</button>
          {showPreview && (
            <>
              <ul>
                {rows.map((r, i) => {
                  const team = teams.find(t => t.id == r.teamId)?.name || "Team";
                  const type = types[r.teamId]?.find(t => t.id == r.typeId)?.type_name || "Type";
                  return <li key={i}>{team} – {type} – {r.count} nos</li>;
                })}
              </ul>
              <button onClick={handleSubmit} style={btnPrimary}>Submit Attendance</button>
            </>
          )}
          <button onClick={() => setScreen("home")} style={btnSecondary}>Back</button>
        </>
      )}

      {screen === "home" && (
        <>
          <h3>Welcome, {user?.email?.split("@")[0]}</h3>
          <button onClick={() => setScreen("enter")} style={btnPrimary}>Enter Attendance</button>
          <button onClick={() => setScreen("view")} style={btnSecondary}>View Attendance</button>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 10,
  border: "1px solid #ccc",
};

const cardStyle = {
  background: "#fff",
  padding: 16,
  marginBottom: 16,
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

const btnPrimary = {
  padding: 12,
  background: "#1d4ed8",
  color: "white",
  border: "none",
  borderRadius: 8,
  marginTop: 10,
  width: "100%",
};

const btnSecondary = {
  padding: 12,
  background: "#e2e8f0",
  color: "black",
  border: "none",
  borderRadius: 8,
  marginTop: 10,
  width: "100%",
};

const deleteBtn = {
  background: "#e11d48",
  color: "white",
  padding: 6,
  border: "none",
  borderRadius: 6,
  marginTop: 6,
};

const addBtn = {
  border: "2px dashed #3b82f6",
  color: "#3b82f6",
  padding: 12,
  marginBottom: 10,
  borderRadius: 8,
  width: "100%",
  background: "#f0f9ff",
};
