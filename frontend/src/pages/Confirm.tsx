import React, { useEffect, useState } from "react"
import axios from "axios"
const api = axios.create({ baseURL:"/api", timeout:8000 })

export default function Confirm(){
  const p = new URLSearchParams(location.search)
  const token = p.get("token") || ""
  const [msg,setMsg] = useState("")
  const [status,setStatus] = useState<"idle"|"ok"|"created"|"error">("idle")
  const [ticketId,setTicketId] = useState<number|undefined>(undefined)

  const handle = async (ok:boolean)=>{
    setMsg("")
    try{
      const r = await api.get("/magic/confirm",{ params:{ token, ok } })
      if(r.data?.already){
        setMsg("Already sent. This confirmation link has been used."); setStatus("ok"); return
      }
      if(!r.data?.ok){ setMsg("Invalid or expired link."); setStatus("error"); return }
      if(ok){ setMsg("Thanks! We marked this as solved."); setStatus("ok") }
      else{ setMsg("We created a ticket from your feedback."); setTicketId(r.data?.created_ticket_id); setStatus("created") }
    }catch{ setMsg("Something went wrong."); setStatus("error") }
  }

  useEffect(()=>{ if(!token) { setMsg("Missing token."); setStatus("error") } },[token])

  return (
    <div className="card" style={{maxWidth:560, margin:"0 auto"}}>
      <div className="title" style={{fontSize:22}}>Confirm fix</div>
      <p className="muted">Did the solution work?</p>
      <div className="flex" style={{gap:8}}>
        <button className="btn-success" onClick={()=>handle(true)}>It worked</button>
        <button className="btn-danger" onClick={()=>handle(false)}>Still broken</button>
      </div>
      {msg && (
        <div className="mt-2">
          <div className="chip" style={{color: status==="error" ? "var(--red)" : "var(--text)"}}>
            {msg}{status==="created" && ticketId ? <> (Ticket PG-{ticketId})</> : null}
          </div>
        </div>
      )}
      <div className="mt-2"><a href="/">Go to Ask</a> &nbsp;|&nbsp; <a href="/login">Back to Login</a></div>
    </div>
  )
}