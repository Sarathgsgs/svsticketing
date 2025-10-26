import React, { useEffect, useState } from "react"
import axios from "axios"
const api = axios.create({ baseURL:"/api", timeout:8000 })

type Notice = { id:number; username:string; message:string; type:string; ts:string; link?:string }

export default function Dashboard(){
  const p = new URLSearchParams(location.search)
  const user = p.get("user") || "tech2345"
  const [items,setItems] = useState<Notice[]>([])
  const [loading,setLoading] = useState(false)

  const load = async()=>{ setLoading(true); try{ const r=await api.get("/notifications",{params:{user}}); setItems(r.data?.items||[]) } finally{ setLoading(false) } }
  useEffect(()=>{ load() },[user])

  return (
    <>
      <div className="card">
        <div className="title" style={{fontSize:22}}>Welcome, {user}</div>
        <div className="chip" style={{marginTop:6}}>You are signed in. Problem solved state persisted.</div>
        <div className="mt-2"><a href="/">Go to Ask</a> &nbsp;|&nbsp; <a href="/resolve">Resolve</a></div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div className="title" style={{fontSize:18}}>Recent notifications</div>
        <div className="flex" style={{gap:8, marginTop:8}}>
          <button className="btn-secondary" onClick={load} disabled={loading}>{loading?"Refreshing...":"Refresh"}</button>
        </div>
        <ul style={{listStyle:"none", paddingLeft:0, margin:0, marginTop:8}}>
          {items.length===0 && <li className="muted">No notifications</li>}
          {items.map(n=>(
            <li key={n.id} style={{borderBottom:"1px dashed var(--border)", padding:"8px 0"}}>
              <span className="badge">{n.type||"info"}</span> {n.message}
              {n.link && <> — <a href={n.link}>Open</a></>}
              <span className="muted"> — {new Date(n.ts).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}