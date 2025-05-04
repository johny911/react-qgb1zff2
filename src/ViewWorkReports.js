import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function ViewWorkReports({ onBack }) {
  const [projectId, setProjectId] = useState('')
  const [date, setDate]           = useState(new Date().toISOString().split('T')[0])
  const [projects, setProjects]   = useState([])
  const [rows, setRows]           = useState([])

  useEffect(() => {
    supabase.from('projects').select('id,name').then(({ data }) => setProjects(data||[]))
  }, [])

  const fetchReports = async () => {
    if (!projectId||!date) return alert('Select project & date')
    const { data, error } = await supabase
      .from('view_work_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date)
      .order('allotment_id', { ascending: true })
    if (error) return alert(error.message)
    setRows(data||[])
  }

  return (
    <div style={{padding:20}}>
      <h3>View Work Done Report</h3>
      <button onClick={onBack} style={{marginBottom:12}}>← Back</button>

      <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={input}>
        <option value=''>-- Project --</option>
        {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input type='date' value={date} onChange={e=>setDate(e.target.value)} style={input}/>
      <button onClick={fetchReports} style={btnPrimary}>Load</button>

      {rows.length===0
        ? <p>No allocations found.</p>
        : rows.map(r=>(
            <div key={`${r.allotment_id}-${r.labour_id}`} style={card}>
              <strong>{r.work_description}</strong> — {r.quantity} {r.uom}
              <div style={{paddingLeft:12,marginTop:8}}>
                {r.team_name} / {r.labour_type_name}: {r.count} nos
              </div>
            </div>
          ))
      }
    </div>
  )
}

const input = {width:'100%',padding:8,marginBottom:12,border:'1px solid #ccc',borderRadius:6,boxSizing:'border-box'}
const btnPrimary = {...input,background:'#3b6ef6',color:'#fff',cursor:'pointer'}
const card = {border:'1px solid #ddd',borderRadius:8,padding:16,marginBottom:16,background:'#fafafa'}