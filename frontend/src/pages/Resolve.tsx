import { useEffect, useMemo, useState } from "react"
import axios from "axios"
const api = axios.create({ baseURL:"/api", timeout:8000 })

export default function Resolve(){
  const [tickets,setTickets]=useState<any[]>([])
  const [q,setQ]=useState("")
  const [service,setService]=useState("all")
  const [status,setStatus]=useState("open")
  const [sortRisk,setSortRisk]=useState(false)
  const [draft,setDraft]=useState<{id:number,text:string}|null>(null)
  const [similar,setSimilar]=useState<Record<number,any[]>>({})

  const load=()=>{ const p:any={}; if(q) p.q=q; if(service!=="all") p.service=service; if(status!=="all") p.status=status; if(sortRisk) p.sort="risk"; api.get("/tickets",{params:p}).then(r=>setTickets(r.data)) }
  useEffect(()=>{ load() },[q,service,status,sortRisk])

  const services=useMemo(()=>{ const s=new Set<string>(); tickets.forEach(t=>{ if(t.service) s.add(t.service) }); return Array.from(s).sort() },[tickets])
  const riskColor=(r:number)=> r>0.75?"red": r>0.5?"amber":"green"
  const getSimilar=async(id:number)=>{ const r=await api.get(`/tickets/similar/${id}?k=3`); setSimilar(p=>({...p,[id]:r.data})) }
  const mergeWith=async(id:number,dups:number[])=>{ if(dups.length===0) return; await api.post("/tickets/merge",{source_id:id,duplicate_ids:dups}); alert(`Merged ${dups.length} ticket(s) into PG-${id}`); load() }
  const markResolved=async(id:number)=>{ await api.post("/tickets/status",{ticket_id:id,status:"resolved"}); load() }
  const draftReply=async(id:number,subj:string,body:string)=>{ const r=await api.post("/assist/reply",{subject:subj,body}); setDraft({id,text:r.data?.reply||"No draft"}) }

  return (
    <div>
      <h1 className="page-title">Resolve</h1>
      <div className="grid grid-2">
        <input placeholder="Search tickets..." value={q} onChange={e=>setQ(e.target.value)}/>
        <div className="flex">
          <select value={service} onChange={e=>setService(e.target.value)}>
            <option value="all">All services</option>
            {services.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="open">Open</option><option value="resolved">Resolved</option><option value="merged">Merged</option><option value="all">All</option>
          </select>
          <label className="flex"><input type="checkbox" checked={sortRisk} onChange={e=>setSortRisk(e.target.checked)}/><span>Sort by risk</span></label>
        </div>
      </div>
      <div className="grid" style={{marginTop:12}}>
        {tickets.map(t=>(
          <div key={t.id} className="card">
            <div className="font-medium">PG-{t.id} - {t.subject||"(no subject)"}</div>
            <div className="muted">
              <span className={`dot ${riskColor(t.risk)}`}></span>
              {(t.service||"-")}{" "}{'->'}{" "}{(t.assignment_group||"-")}{" | "}{t.priority||"P3"}{" | "}
              {"conf "}{Math.round((t.triage_confidence||0)*100)}%{" | "}
              {"risk "}{Math.round((t.risk||0)*100)}%
            </div>
            <div className="flex" style={{marginTop:8}}>
              <button className="btn" onClick={()=>draftReply(t.id,t.subject,t.body)}>Draft reply</button>
              <button className="btn-secondary" onClick={()=>markResolved(t.id)}>Mark resolved</button>
              <button className="btn-secondary" onClick={()=>getSimilar(t.id)}>Find duplicates</button>
              <button className="btn-secondary" onClick={async()=>{ const r=await api.post("/kb/from_ticket",null,{params:{ticket_id:t.id}}); alert(r.data?.ok?"KB created":"KB failed") }}>Create KB</button>
            </div>
            {similar[t.id]?.length>0 && (
              <div className="mt-2">
                <div className="font-medium">Similar tickets</div>
                <ul style={{marginLeft:18}}>{similar[t.id].map((s:any)=><li key={s.ticket_id}>PG-{s.ticket_id} - similarity {Math.round(s.similarity*100)}%</li>)}</ul>
                <button className="btn-success" onClick={()=>mergeWith(t.id, similar[t.id].map((s:any)=>s.ticket_id))}>Merge all into PG-{t.id}</button>
              </div>
            )}
            {draft && draft.id===t.id && (
              <div className="card" style={{marginTop:8}}>
                <div className="font-medium">Draft reply</div>
                <textarea value={draft.text} onChange={e=>setDraft({id:t.id,text:e.target.value})}/>
                <div className="flex">
                  <button className="btn-secondary" onClick={()=>navigator.clipboard.writeText(draft.text)}>Copy</button>
                  <button className="btn-secondary" onClick={()=>setDraft(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}