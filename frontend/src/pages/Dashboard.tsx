import { useEffect, useState } from "react"
import axios from "axios"
const api=axios.create({baseURL:"/api",timeout:8000})

export default function Dashboard(){
  const p=new URLSearchParams(location.search); const user=p.get("user")||"tech2345"
  const [items,setItems]=useState<any[]>([])
  useEffect(()=>{ (async()=>{ try{ const r=await api.get(`/notifications?user=${encodeURIComponent(user)}`); setItems(r.data?.items||[]) }catch{} })() },[user])
  return (
    <div className="container">
      <h1 className="page-title">Welcome, {user}</h1>
      <div className="card">
        <div className="page-title" style={{fontSize:18}}>Status</div>
        <div className="chip">Problem solved. You are signed in.</div>
      </div>
      <div className="card mt-2">
        <div className="page-title" style={{fontSize:18}}>Recent notifications</div>
        <ul style={{listStyle:"none", paddingLeft:0, margin:0}}>
          {items.length===0 && <li className="muted">No notifications</li>}
          {items.map(n=>(
            <li key={n.id} style={{borderBottom:"1px dashed var(--border)", padding:"6px 0"}}>
              <span className="badge">{n.type}</span> {n.message}
              <span className="muted"> — {new Date(n.ts).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}