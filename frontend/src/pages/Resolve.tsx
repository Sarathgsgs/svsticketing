import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
const api = axios.create({ baseURL:"/api", timeout:8000 })

const ACTIONS = [
  { id: "clear_spooler", label: "Clear Spooler" },
  { id: "restart_service", label: "Restart Service" },
  { id: "unlock_user", label: "Unlock User" },
]

function ageStr(iso?: string){
  if(!iso) return "-"
  try{
    const dt = new Date(iso); const ms = Date.now()-dt.getTime()
    const h = Math.floor(ms/3600000); const m = Math.floor((ms%3600000)/60000)
    return h>0 ? `${h}h ${m}m` : `${m}m`
  }catch{return "-"}
}
function riskDot(val:number){ return val>0.75?"red":val>0.5?"amber":"green" }

function AddWorklog({ ticketId, onAdded }:{ ticketId:number, onAdded:()=>void }) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const author = localStorage.getItem("role") || "agent1"
  const save = async () => {
    setSaving(true)
    await api.post("/tickets/worklog", { ticket_id: ticketId, author, note })
    setNote(""); setSaving(false); onAdded()
  }
  return (
    <div style={{marginTop:6}}>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add worklog..." style={{minHeight:40}}/>
      <button className="btn-secondary" onClick={save} disabled={saving||!note.trim()}>Add</button>
    </div>
  )
}

export default function Resolve(){
  const [tickets,setTickets]=useState<any[]>([])
  const [q,setQ]=useState("")
  const [service,setService]=useState("all")
  const [status,setStatus]=useState("open")
  const [sortRisk,setSortRisk]=useState(false)
  const [actionSel, setActionSel] = useState<{[id:number]: string}>({})
  const [elevTok, setElevTok] = useState<string>("")
  const [drawer, setDrawer] = useState<any|null>(null)
  const [similar, setSimilar] = useState<any[]>([])
  const [mi, setMi] = useState<any|null>(null)
  const [miMembers, setMiMembers] = useState<any[]>([])

  // Load tickets
  const load=()=>{ const p:any={}; if(q) p.q=q; if(service!=="all") p.service=service; if(status!=="all") p.status=status; if(sortRisk) p.sort="risk"; api.get("/tickets",{params:p}).then(r=>setTickets(r.data)) }
  useEffect(()=>{ load() },[q,service,status,sortRisk])

  const servicesList = useMemo(()=>{ const s=new Set<string>(); tickets.forEach(t=>{ if(t.service) s.add(t.service) }); return Array.from(s).sort() },[tickets])

  // Open details drawer
  const openDrawer = async (t:any) => {
    setDrawer(null)
    // Get MI membership
    const miRes = await api.get(`/mi/for_ticket/${t.id}`)
    setMi(miRes.data?.mi || null)
    // Get similar tickets
    const simRes = await api.get(`/tickets/similar/${t.id}?k=5`)
    setSimilar(simRes.data || [])
    // Get MI members if in MI
    if (miRes.data?.mi) {
      const ids = miRes.data.mi.members
      const all = await api.get("/tickets")
      setMiMembers((all.data||[]).filter((tk:any)=>ids.includes(tk.id)))
    } else {
      setMiMembers([])
    }
    setDrawer(t)
  }

  // Merge similar tickets
  const mergeWith = async (id:number, dups:number[]) => {
    if(dups.length===0) return
    await api.post("/tickets/merge",{source_id:id,duplicate_ids:dups})
    alert(`Merged ${dups.length} into PG-${id}`)
    load()
    setDrawer(null)
  }

  // Mark resolved
  const markResolved = async (id:number) => {
    await api.post("/tickets/status",{ticket_id:id,status:"resolved"})
    load()
    setDrawer(null)
  }

  // Request approval
  const requestApproval = async (ticket:any) => {
    const action_id = actionSel[ticket.id] || "clear_spooler"
    const params:any = {}
    if(action_id==="clear_spooler"){ params.printer = "PRN-01" }
    if(action_id==="restart_service"){ params.service = "SomeService" }
    if(action_id==="unlock_user"){ params.user = "tech2345" }
    const r = await api.post("/actions/request", {
      action_id, params, requested_by: "agent1", require_elevation: !!elevTok, elevation_token: elevTok || null
    })
    alert(`Approval requested (#${r.data?.approval?.id}). Admin can approve in Govern.`)
  }

  // Create MI
  const createMI = async (id:number) => {
    const r = await api.post("/mi/create", { seed_ticket_id: id, threshold: 0.85 })
    alert(`MI-${r.data?.mi?.id} created (${r.data?.mi?.members?.length||0} members)`)
    load()
    setDrawer(null)
  }

  // Render details drawer/modal
  const renderDrawer = () => {
    if (!drawer) return null
    return (
      <div style={{
        position:"fixed", top:0, right:0, width:"420px", height:"100%", background:"var(--panel2)", boxShadow:"-2px 0 16px #0008", zIndex:1000, padding:"24px", overflowY:"auto"
      }}>
        <button className="btn-danger" style={{position:"absolute",top:12,right:12}} onClick={()=>setDrawer(null)}>Close</button>
        <div className="title" style={{fontSize:22}}>Ticket PG-{drawer.id}</div>
        <div className="muted" style={{marginBottom:8}}>{drawer.subject}</div>
        <div style={{marginBottom:8}}>
          <span className="badge">{drawer.service||"-"}</span>{" "}{'->'}{" "}<span className="badge">{drawer.assignment_group||"-"}</span>
          <span className={`pri ${drawer.priority||"P3"}`}>{drawer.priority||"P3"}</span>
          <span className="chip">{drawer.status}</span>
          <span className={`dot ${riskDot(drawer.risk)}`}></span> {Math.round((drawer.risk||0)*100)}% risk
        </div>
        <div style={{marginBottom:8}}><b>Details:</b><br/>{drawer.body}</div>
        <div style={{marginBottom:8}}><b>Created:</b> {new Date(drawer.created_at).toLocaleString()} <b>Age:</b> {ageStr(drawer.created_at)}</div>
        {/* Blast radius and recent change */}
        {drawer.context?.blast_radius?.users_affected && (
          <div className="chip" style={{marginBottom:4}}>Blast radius: {drawer.context.blast_radius.users_affected} users</div>
        )}
        {drawer.context?.recent_change && (
          <div className="chip" style={{marginBottom:4, color:"var(--amber)"}}>Recent change: {drawer.context.recent_change.desc}</div>
        )}
        {/* MI membership */}
        {mi && (
          <div className="card" style={{margin:"10px 0"}}>
            <div className="title" style={{fontSize:16}}>Major Incident MI-{mi.id}</div>
            <div className="muted">Members: {mi.members.length}</div>
            <ul style={{listStyle:"none",paddingLeft:0,margin:0}}>
              {miMembers.map((m:any)=>(
                <li key={m.id}>PG-{m.id}: {m.subject}</li>
              ))}
            </ul>
          </div>
        )}
        {/* Similar tickets */}
        {similar.length>0 && (
          <div className="card" style={{margin:"10px 0"}}>
            <div className="title" style={{fontSize:16}}>Similar tickets</div>
            <ul style={{listStyle:"none",paddingLeft:0,margin:0}}>
              {similar.map((s:any)=>(
                <li key={s.ticket_id}>PG-{s.ticket_id} · similarity {Math.round((s.similarity||0)*100)}%</li>
              ))}
            </ul>
            <button className="btn-success" onClick={()=>mergeWith(drawer.id, similar.map((s:any)=>s.ticket_id))}>Merge all</button>
          </div>
        )}
        {/* Worklogs */}
        <div style={{marginTop:10}}>
          <div className="title" style={{fontSize:16}}>Worklogs</div>
          <ul style={{listStyle:"none",paddingLeft:0,margin:0}}>
            {drawer.worklogs && drawer.worklogs.length>0 ? drawer.worklogs.map((w:any,i:number)=>(
              <li key={i}><b>{w.author}</b> [{new Date(w.ts).toLocaleString()}]: {w.note}</li>
            )) : <li className="muted">No worklogs</li>}
          </ul>
          <AddWorklog ticketId={drawer.id} onAdded={()=>openDrawer(drawer)} />
        </div>
        {/* Actions */}
        <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn-secondary" onClick={()=>markResolved(drawer.id)}>Resolve</button>
          <button className="btn-secondary" onClick={()=>createMI(drawer.id)}>Create MI</button>
          <select value={actionSel[drawer.id] || "clear_spooler"} onChange={e=>setActionSel(p=>({...p,[drawer.id]:e.target.value}))}>
            {ACTIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <input placeholder="Elev. token (optional)" value={elevTok} onChange={e=>setElevTok(e.target.value)} style={{width:150}}/>
          <button className="btn" onClick={()=>requestApproval(drawer)}>Run w/ approval</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card" style={{marginBottom:10}}>
        <div style={{display:"flex", gap:10, alignItems:"center", flexWrap:"wrap"}}>
          <input placeholder="Search subject/body..." value={q} onChange={e=>setQ(e.target.value)} />
          <select value={service} onChange={e=>setService(e.target.value)}>
            <option value="all">All services</option>
            {servicesList.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="open">Open</option><option value="resolved">Resolved</option><option value="merged">Merged</option><option value="all">All</option>
          </select>
          <label style={{display:"flex", alignItems:"center", gap:8}}>
            <input type="checkbox" checked={sortRisk} onChange={e=>setSortRisk(e.target.checked)}/> Sort by risk
          </label>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:80}}>ID</th>
              <th>Subject</th>
              <th style={{width:320}}>Service → Group</th>
              <th style={{width:110}}>Priority</th>
              <th style={{width:110}}>Status</th>
              <th style={{width:100}}>Risk</th>
              <th style={{width:90}}>Age</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t=>(
              <tr key={t.id} style={{cursor:"pointer"}} onClick={()=>openDrawer(t)}>
                <td>PG-{t.id}</td>
                <td>{t.subject || "(no subject)"}</td>
                <td><span className="badge">{t.service||"-"}</span>{" "}{'->'}{" "}<span className="badge">{t.assignment_group||"-"}</span></td>
                <td><span className={`pri ${t.priority||"P3"}`}>{t.priority||"P3"}</span></td>
                <td>{t.status}</td>
                <td><span className={`dot ${riskDot(t.risk)}`}></span> {Math.round((t.risk||0)*100)}%</td>
                <td>{ageStr(t.created_at)}</td>
              </tr>
            ))}
            {tickets.length===0 && (
              <tr><td colSpan={7} style={{color:"var(--muted)"}}>No tickets found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {renderDrawer()}
    </>
  )
}