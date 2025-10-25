import { useEffect, useMemo, useState } from "react"
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

export default function Resolve(){
  const [tickets,setTickets]=useState<any[]>([])
  const [q,setQ]=useState("")
  const [service,setService]=useState("all")
  const [status,setStatus]=useState("open")
  const [sortRisk,setSortRisk]=useState(false)
  const [similar,setSimilar]=useState<Record<number,any[]>>({})
  const [actionSel, setActionSel] = useState<{[id:number]: string}>({})
  const [elevTok, setElevTok] = useState<string>("")

  const load=()=>{ const p:any={}; if(q) p.q=q; if(service!=="all") p.service=service; if(status!=="all") p.status=status; if(sortRisk) p.sort="risk"; api.get("/tickets",{params:p}).then(r=>setTickets(r.data)) }
  useEffect(()=>{ load() },[q,service,status,sortRisk])

  const servicesList = useMemo(()=>{ const s=new Set<string>(); tickets.forEach(t=>{ if(t.service) s.add(t.service) }); return Array.from(s).sort() },[tickets])

  const getSimilar=async(id:number)=>{ const r=await api.get(`/tickets/similar/${id}?k=3`); setSimilar(p=>({...p,[id]:r.data})) }
  const mergeWith=async(id:number,dups:number[])=>{ if(dups.length===0) return; await api.post("/tickets/merge",{source_id:id,duplicate_ids:dups}); alert(`Merged ${dups.length} into PG-${id}`); load() }
  const markResolved=async(id:number)=>{ await api.post("/tickets/status",{ticket_id:id,status:"resolved"}); load() }

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

  const createMI = async (id:number) => {
    const r = await api.post("/mi/create", { seed_ticket_id: id, threshold: 0.85 })
    alert(`MI-${r.data?.mi?.id} created (${r.data?.mi?.members?.length||0} members)`)
  }

  return (
    <>
      <div className="card" style={{marginBottom:10}}>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
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
              <th style={{width:360}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t=>(
              <tr key={t.id}>
                <td>PG-{t.id}</td>
                <td>{t.subject || "(no subject)"}</td>
                <td><span className="badge">{t.service||"-"}</span>{" "}{'->'}{" "}<span className="badge">{t.assignment_group||"-"}</span></td>
                <td><span className={`pri ${t.priority||"P3"}`}>{t.priority||"P3"}</span></td>
                <td>{t.status}</td>
                <td><span className={`dot ${riskDot(t.risk)}`}></span> {Math.round((t.risk||0)*100)}%</td>
                <td>{ageStr(t.created_at)}</td>
                <td>
                  <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                    <button className="btn-secondary" onClick={()=>markResolved(t.id)}>Resolve</button>
                    <button className="btn-secondary" onClick={()=>getSimilar(t.id)}>Similar</button>
                    {similar[t.id]?.length>0 && (
                      <button className="btn-success" onClick={()=>mergeWith(t.id, similar[t.id].map((s:any)=>s.ticket_id))}>Merge all</button>
                    )}
                    <button className="btn-secondary" onClick={()=>createMI(t.id)}>Create MI</button>
                    <select value={actionSel[t.id] || "clear_spooler"} onChange={e=>setActionSel(p=>({...p,[t.id]:e.target.value}))}>
                      {ACTIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                    <input placeholder="Elev. token (optional)" value={elevTok} onChange={e=>setElevTok(e.target.value)} style={{width:150}}/>
                    <button className="btn" onClick={()=>requestApproval(t)}>Run w/ approval</button>
                  </div>
                </td>
              </tr>
            ))}
            {tickets.length===0 && (
              <tr><td colSpan={8} style={{color:"var(--muted)"}}>No tickets found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}