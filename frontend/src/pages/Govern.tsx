import { useEffect, useState } from "react"
import axios from "axios"
const api = axios.create({ baseURL:"/api", timeout:8000 })

export default function Govern(){
  const [metrics,setMetrics]=useState<any>({})
  const [cfg,setCfg]=useState<any>({ auto_resolve_threshold:{triage:0.6,kb:0.6}, dedup_similarity:0.8 })
  const [busy,setBusy]=useState(false)

  const load=async()=>{ const m=await api.get("/metrics"); setMetrics(m.data); const c=await api.get("/admin/config"); setCfg(c.data) }
  useEffect(()=>{ load() },[])

  const saveCfg=async()=>{ await api.post("/admin/config",cfg); alert("Saved") }
  const retriage=async()=>{ setBusy(true); const r=await api.post("/admin/retriage"); alert(`Re-triaged ${r.data.updated}`); setBusy(false); load() }

  const setTri=(v:number)=>setCfg((p:any)=>({...p,auto_resolve_threshold:{...p.auto_resolve_threshold,triage:v}}))
  const setKb=(v:number)=>setCfg((p:any)=>({...p,auto_resolve_threshold:{...p.auto_resolve_threshold,kb:v}}))
  const setDup=(v:number)=>setCfg((p:any)=>({...p,dedup_similarity:v}))

  return (
    <div>
      <h1 className="page-title">Govern</h1>
      <div className="grid grid-2">
        <div className="card"><div className="muted">Tickets</div><div className="page-title" style={{fontSize:26}}>{metrics.tickets??"-"}</div></div>
        <div className="card"><div className="muted">Resolved without ticket</div><div className="page-title" style={{fontSize:26}}>{metrics.deflections??"-"}</div></div>
      </div>
      <div className="grid grid-2" style={{marginTop:8}}>
        <div className="card"><div className="muted">Merged</div><div className="page-title" style={{fontSize:26}}>{metrics.merged??"-"}</div></div>
        <div className="card"><div className="muted">Resolved</div><div className="page-title" style={{fontSize:26}}>{metrics.resolved??"-"}</div></div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <div className="page-title" style={{fontSize:18}}>Policy configuration</div>
        <div className="grid grid-2">
          <div><label>Triage threshold</label><input type="range" min="0" max="1" step="0.05" value={cfg?.auto_resolve_threshold?.triage||0.6} onChange={e=>setTri(Number(e.target.value))}/><div>{(cfg?.auto_resolve_threshold?.triage||0.6).toFixed(2)}</div></div>
          <div><label>KB score threshold</label><input type="range" min="0" max="1" step="0.05" value={cfg?.auto_resolve_threshold?.kb||0.6} onChange={e=>setKb(Number(e.target.value))}/><div>{(cfg?.auto_resolve_threshold?.kb||0.6).toFixed(2)}</div></div>
        </div>
        <div className="mt-2"><label>Dedup similarity</label><input type="range" min="0" max="1" step="0.05" value={cfg?.dedup_similarity||0.8} onChange={e=>setDup(Number(e.target.value))}/><div>{(cfg?.dedup_similarity||0.8).toFixed(2)}</div></div>
        <div className="flex mt-2"><button className="btn" onClick={saveCfg} disabled={busy}>Save config</button><button className="btn-secondary" onClick={retriage} disabled={busy}>{busy?"Re-triaging...":"Re-triage old tickets"}</button></div>
        <div className="flex mt-2">
  <button className="btn" onClick={saveCfg} disabled={busy}>Save config</button>
  <button className="btn-secondary" onClick={retriage} disabled={busy}>
    {busy ? "Re-triaging..." : "Re-triage old tickets"}
  </button>
  <button
    className="btn-danger"
    onClick={async () => {
      try {
        await api.post("/demo/reset", {}) // username defaults to "tech2345"
        alert("Demo reset: user re-locked and notifications cleared.")
      } catch (e) {
        alert("Reset failed")
        console.error(e)
      }
    }}
  >
    Reset demo
  </button>
</div>
      </div>
    </div>
  )
}