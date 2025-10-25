import { useEffect, useMemo, useState } from "react"
import axios from "axios"
const api = axios.create({ baseURL:"/api", timeout:8000 })

type SeriesPoint = { ts: string; total: number; by_service?: Record<string, number> }

function LineChart({ data, width=680, height=180 }:{ data: SeriesPoint[], width?:number, height?:number }) {
  const pad = 24
  const innerW = width - pad*2
  const innerH = height - pad*2
  const totals = data.map(d=>d.total||0)
  const max = Math.max(1, ...totals)
  const pts = data.map((d,i)=>{
    const x = pad + (i*(innerW/Math.max(1,data.length-1)))
    const y = pad + (innerH - ((d.total||0)/max)*innerH)
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width={width} height={height} style={{border:"1px solid var(--border)", borderRadius:12, background:"rgba(255,255,255,.02)"}}>
      <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={pts}/>
      {data.map((d,i)=>{
        const x = pad + (i*(innerW/Math.max(1,data.length-1)))
        const y = pad + (innerH - ((d.total||0)/max)*innerH)
        return <circle key={i} cx={x} cy={y} r={2.8} fill="var(--accent)"/>
      })}
      <text x={pad} y={14} fontSize="12" fill="var(--muted)">Last {data.length}h</text>
      <text x={width-pad} y={14} fontSize="12" fill="var(--muted)" textAnchor="end">Total tickets</text>
    </svg>
  )
}

function BarChart({ items, width=680, height=220, title }:{
  items: { key: string, value: number }[]
  width?: number, height?: number, title?: string
}) {
  const pad = 24
  const barH = 22
  const gap = 10
  const usableH = height - pad*2
  const maxBars = Math.min(items.length, Math.floor(usableH/(barH+gap)))
  const top = items.slice(0, maxBars)
  const maxV = Math.max(1, ...top.map(i=>i.value))
  return (
    <svg width={width} height={height} style={{border:"1px solid var(--border)", borderRadius:12, background:"rgba(255,255,255,.02)"}}>
      {title && <text x={pad} y={18} fontSize="12" fill="var(--muted)">{title}</text>}
      {top.map((it, idx)=>{
        const y = pad + 12 + idx*(barH+gap)
        const w = ((it.value||0)/maxV) * (width - pad*2 - 80)
        return (
          <g key={it.key}>
            <rect x={pad} y={y} width={w} height={barH} fill="var(--accent)"/>
            <text x={pad} y={y-2} fontSize="12" fill="var(--muted)">{it.key}</text>
            <text x={pad+w+8} y={y+barH-6} fontSize="12" fill="var(--text)">{it.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Govern(){
  const [metrics,setMetrics]=useState<any>({})
  const [cfg,setCfg]=useState<any>({ auto_resolve_threshold:{triage:0.6,kb:0.6}, dedup_similarity:0.8 })
  const [busy,setBusy]=useState(false)
  const [approvals,setApprovals]=useState<any[]>([])
  const [spikes,setSpikes]=useState<any[]>([])
  const [series,setSeries]=useState<SeriesPoint[]>([])
  const [breakdown,setBreakdown]=useState<{service:Record<string,number>, priority:Record<string,number>, status:Record<string,number>}|null>(null)

  const load=async()=>{ const m=await api.get("/metrics"); setMetrics(m.data); const c=await api.get("/admin/config"); setCfg(c.data) }
  const loadApprovals = async()=>{ const r=await api.get("/approvals"); setApprovals(r.data?.items||[]) }
  const loadSpikes = async()=>{ const r=await api.get("/spikes"); setSpikes(r.data?.items||[]) }
  const loadSeries = async()=>{ const r=await api.get("/metrics/series", { params:{ hours: 24 } }); setSeries(r.data?.items||[]) }
  const loadBreakdown = async()=>{ const r=await api.get("/metrics/breakdown"); setBreakdown(r.data||null) }

  useEffect(()=>{ load(); loadApprovals(); loadSpikes(); loadSeries(); loadBreakdown() },[])

  const saveCfg=async()=>{ await api.post("/admin/config",cfg); alert("Saved") }
  const retriage=async()=>{ setBusy(true); const r=await api.post("/admin/retriage"); alert(`Re-triaged ${r.data.updated}`); setBusy(false); load() }
  const setTri=(v:number)=>setCfg((p:any)=>({...p,auto_resolve_threshold:{...p.auto_resolve_threshold,triage:v}}))
  const setKb=(v:number)=>setCfg((p:any)=>({...p,auto_resolve_threshold:{...p.auto_resolve_threshold,kb:v}}))
  const setDup=(v:number)=>setCfg((p:any)=>({...p,dedup_similarity:v}))

  const approve = async (id:number, ok:boolean)=>{
    await api.post("/actions/decision",{id,approved:ok,reviewer:"admin1"})
    await loadApprovals()
  }

  const resetDemo = async ()=>{
    await api.post("/demo/reset",{})
    alert("Demo reset: user re-locked and notifications cleared.")
  }

  const serviceBars = useMemo(()=>{
    if(!breakdown?.service) return []
    const entries = Object.entries(breakdown.service).map(([k,v])=>({key:k, value: v as number}))
    entries.sort((a,b)=>b.value-a.value)
    return entries
  },[breakdown])

  return (
    <>
      <div className="grid grid-2">
        <div className="card">
          <div className="breadcrumb">Service Desk</div>
          <div className="title">Metrics</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4, minmax(0,1fr))", gap:10, marginTop:10}}>
            <div className="card"><div className="muted">Tickets</div><div className="title" style={{fontSize:22}}>{metrics.tickets??"-"}</div></div>
            <div className="card"><div className="muted">Deflections</div><div className="title" style={{fontSize:22}}>{metrics.deflections??"-"}</div></div>
            <div className="card"><div className="muted">Merged</div><div className="title" style={{fontSize:22}}>{metrics.merged??"-"}</div></div>
            <div className="card"><div className="muted">Resolved</div><div className="title" style={{fontSize:22}}>{metrics.resolved??"-"}</div></div>
          </div>
        </div>

        <div className="card">
          <div className="breadcrumb">Policy</div>
          <div className="title">Auto-resolve thresholds</div>
          <div className="grid grid-2" style={{marginTop:10}}>
            <div>
              <label>Triage threshold</label>
              <input type="range" min="0" max="1" step="0.05" value={cfg?.auto_resolve_threshold?.triage||0.6} onChange={e=>setTri(Number(e.target.value))}/>
              <div>{(cfg?.auto_resolve_threshold?.triage||0.6).toFixed(2)}</div>
            </div>
            <div>
              <label>KB score threshold</label>
              <input type="range" min="0" max="1" step="0.05" value={cfg?.auto_resolve_threshold?.kb||0.6} onChange={e=>setKb(Number(e.target.value))}/>
              <div>{(cfg?.auto_resolve_threshold?.kb||0.6).toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-1"><label>Dedup similarity</label>
            <input type="range" min="0" max="1" step="0.05" value={cfg?.dedup_similarity||0.8} onChange={e=>setDup(Number(e.target.value))}/>
            <div>{(cfg?.dedup_similarity||0.8).toFixed(2)}</div>
          </div>
          <div style={{display:"flex", gap:10, marginTop:10}}>
            <button className="btn" onClick={saveCfg} disabled={busy}>Save</button>
            <button className="btn-secondary" onClick={retriage} disabled={busy}>{busy?"Re-triaging...":"Re-triage"}</button>
            <button className="btn-danger" onClick={resetDemo}>Reset demo</button>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{marginTop:12}}>
        <div className="card">
          <div className="breadcrumb">Analytics</div>
          <div className="title">Tickets per hour (last 24h)</div>
          <div style={{marginTop:10}}>
            <LineChart data={series}/>
          </div>
        </div>

        <div className="card">
          <div className="breadcrumb">Analytics</div>
          <div className="title">Tickets by service</div>
          <div style={{marginTop:10}}>
            <BarChart items={serviceBars} title="Top services"/>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{marginTop:12}}>
        <div className="card">
          <div className="breadcrumb">Operations</div>
          <div className="title">Approvals</div>
          <ul style={{listStyle:"none", paddingLeft:0, margin:0, marginTop:10}}>
            {approvals.length===0 && <li className="muted">No approvals</li>}
            {approvals.map(a=>(
              <li key={a.id} style={{borderBottom:"1px dashed var(--border)", padding:"6px 0"}}>
                #{a.id} · {a.action_id} · <b>{a.status}</b> · by {a.requested_by}
                <div style={{display:"flex", gap:6, marginTop:6}}>
                  <button className="btn-success" onClick={()=>approve(a.id,true)}>Approve</button>
                  <button className="btn-danger" onClick={()=>approve(a.id,false)}>Deny</button>
                </div>
                {a.logs && a.logs.length>0 && <div className="mt-1 muted">{a.logs.join(" | ")}</div>}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="breadcrumb">Analytics</div>
          <div className="title">Live spikes (last hour)</div>
          <ul style={{listStyle:"none", paddingLeft:0, margin:0, marginTop:10}}>
            {spikes.length===0 && <li className="muted">No spikes detected</li>}
            {spikes.map((s,i)=>(
              <li key={i}>Service <b>{s.service}</b> · count {s.count} in {s.window_min} min</li>
            ))}
          </ul>
          <button className="btn-secondary" style={{marginTop:10}} onClick={loadSpikes}>Refresh</button>
        </div>
      </div>
    </>
  )
}