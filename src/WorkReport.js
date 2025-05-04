import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function WorkReport({ onBack }) {
  const [projects, setProjects] = useState([])
  const [teams, setTeams]       = useState([])
  const [types, setTypes]       = useState({})
  const [selectedProject, setSelectedProject] = useState('')
  const [date, setDate]         = useState(() => new Date().toISOString().split('T')[0])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [remainingMap, setRemainingMap]   = useState({})
  const [works, setWorks] = useState([
    { description:'',quantity:'',uom:'',labourAllotments:[{teamId:'',typeId:'',count:''}] }
  ])

  // Load dropdowns
  useEffect(() => {
    ;(async() => {
      const { data:p } = await supabase.from('projects').select('id,name')
      const { data:t } = await supabase.from('labour_teams').select('id,name')
      const { data:ty } = await supabase.from('labour_types').select('id,team_id,type_name')
      const map = {}
      ty.forEach(x => {
        map[x.team_id] = map[x.team_id]||[]
        map[x.team_id].push(x)
      })
      setProjects(p||[])
      setTeams(t||[])
      setTypes(map)
    })()
  }, [])

  // Fetch attendance
  useEffect(() => {
    if (!selectedProject||!date) {
      setAttendanceMap({})
      setRemainingMap({})
      return
    }
    ;(async()=> {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', selectedProject)
        .eq('date', date)
      const att = {}
      data.forEach(r => {
        const k = `${r.team_id}-${r.labour_type_id}`
        att[k] = (att[k]||0) + r.count
      })
      setAttendanceMap(att)
      setRemainingMap({...att})
    })()
  }, [selectedProject,date])

  // Recalc remaining
  const updateRemaining = () => {
    const used = {}
    works.forEach(w =>
      w.labourAllotments.forEach(a => {
        const k = `${a.teamId}-${a.typeId}`
        used[k] = (used[k]||0) + parseInt(a.count||'0',10)
      })
    )
    const rem = {}
    Object.keys(attendanceMap).forEach(k => rem[k] = attendanceMap[k] - (used[k]||0))
    setRemainingMap(rem)
  }

  // Add work & labour
  const addWork = () => setWorks([...works,{ description:'',quantity:'',uom:'',labourAllotments:[{teamId:'',typeId:'',count:''}] }])
  const addLabour = wIdx => {
    const c = [...works]
    c[wIdx].labourAllotments.push({teamId:'',typeId:'',count:''})
    setWorks(c)
  }

  // Update handlers
  const updateWork = (wIdx, f, v) => {
    const c = [...works]; c[wIdx][f] = v; setWorks(c)
  }
  const updateAllot = (wIdx,aIdx,f,v) => {
    const c=[...works]
    c[wIdx].labourAllotments[aIdx][f] = v
    if(f==='teamId') c[wIdx].labourAllotments[aIdx].typeId = ''
    setWorks(c); updateRemaining()
  }

  // Submit
  const handleSubmit = async()=> {
    if(!selectedProject||!date) return alert('Select project & date')
    // validate
    for(let w of works){
      if(!w.description||!w.quantity||!w.uom) return alert('Fill all work fields')
      for(let a of w.labourAllotments) if(!a.teamId||!a.typeId||!a.count) return alert('Fill all labour fields')
    }
    // insert report
    const { data:rp, error:re } = await supabase
      .from('work_reports')
      .insert({ project_id:selectedProject, date, description:`Report ${date}` })
      .select().single()
    if(re) return alert(re.message)
    // each work + labours
    for(let w of works){
      const { data:wa, error:we } = await supabase
        .from('work_allotments')
        .insert({ report_id:rp.id, work_description:w.description, quantity:w.quantity, uom:w.uom })
        .select().single()
      if(we) continue
      const rows = w.labourAllotments.map(a=>({
        work_allotment_id:wa.id,
        team_id:a.teamId,
        labour_type_id:a.typeId,
        count:parseInt(a.count,10)
      }))
      await supabase.from('work_report_labours').insert(rows)
    }
    alert('✅ Work report submitted!')
    onBack()
  }

  return (
    <div style={{padding:20}}>
      <h3>📝 Work Done Report</h3>
      {/* Project & Date */}
      <select style={input} value={selectedProject} onChange={e=>setSelectedProject(e.target.value)}>
        <option value=''>-- Project --</option>
        {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input type='date' style={input} value={date} onChange={e=>setDate(e.target.value)}/>
      {/* Multiple Works */}
      {works.map((w,wIdx)=>(
        <div key={wIdx} style={card}>
          <input placeholder='Work Description' style={input} value={w.description}
            onChange={e=>updateWork(wIdx,'description',e.target.value)}/>
          <input placeholder='Quantity' style={input} value={w.quantity}
            onChange={e=>updateWork(wIdx,'quantity',e.target.value)}/>
          <input placeholder='UOM' style={input} value={w.uom}
            onChange={e=>updateWork(wIdx,'uom',e.target.value)}/>

          <p><strong>Allotted Labours</strong></p>
          {w.labourAllotments.map((a,aIdx)=>{
            const ts = teams.filter(t=>Object.keys(attendanceMap).some(k=>k.startsWith(`${t.id}-`)))
            const tys = (types[a.teamId]||[]).filter(t=>attendanceMap[`${a.teamId}-${t.id}`]>0)
            return (
              <div key={aIdx} style={{marginBottom:8}}>
                <select style={input} value={a.teamId} onChange={e=>updateAllot(wIdx,aIdx,'teamId',e.target.value)}>
                  <option value=''>Team</option>
                  {ts.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select style={input} value={a.typeId} onChange={e=>updateAllot(wIdx,aIdx,'typeId',e.target.value)} disabled={!a.teamId}>
                  <option value=''>Type</option>
                  {tys.map(t=> <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                <input type='number' placeholder='Count' style={input} value={a.count}
                  onChange={e=>updateAllot(wIdx,aIdx,'count',e.target.value)}/>
                {a.teamId&&a.typeId&&<p style={{color:'red'}}>Remaining: {remainingMap[`${a.teamId}-${a.typeId}`]||0} nos</p>}
              </div>
            )
          })}
          <button style={btnSecondary} onClick={()=>addLabour(wIdx)}>+ Add Labour</button>
        </div>
      ))}
      <button style={btnSecondary} onClick={addWork}>+ Add Work</button>
      <button style={btnPrimary} onClick={handleSubmit}>✅ Submit Work Report</button>
      <button style={btnSecondary} onClick={onBack}>← Back</button>
    </div>
  )
}

const input = {width:'100%',padding:8,marginBottom:8,border:'1px solid #ccc',borderRadius:6,boxSizing:'border-box'}
const btnPrimary = {...input,background:'#3b6ef6',color:'#fff',cursor:'pointer'}
const btnSecondary = {...input,background:'#eee',cursor:'pointer'}
const card = {border:'1px solid #ddd',borderRadius:8,padding:12,marginBottom:16}