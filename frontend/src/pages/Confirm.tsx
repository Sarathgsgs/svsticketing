import { useEffect, useState } from "react"
import axios from "axios"

const api = axios.create({ baseURL: "/api", timeout: 8000 })

export default function Confirm(){
  const p = new URLSearchParams(location.search)
  const token = p.get("token") || ""
  const [status,setStatus] = useState<"idle"|"ok"|"error"|"created">("idle")
  const [ticketId,setTicketId] = useState<number|undefined>(undefined)
  const [msg,setMsg] = useState("")

  const handle = async (ok: boolean) => {
  setMsg("")
  try {
    const r = await api.get("/magic/confirm", { params: { token, ok } })
    if (!r.data?.ok) {
      // Treat used/invalid token as "already sent" for a nicer UX
      const reason = r.data?.error || "invalid_or_used_token"
      if (reason === "invalid_or_used_token") {
        setMsg("Already sent. This confirmation link has been used.")
        setStatus("ok") // show as a non-error state
      } else {
        setMsg("Something went wrong. Please try again.")
        setStatus("error")
      }
      return
    }
    if (ok) {
      setMsg("Thanks! We marked this as solved.")
      setStatus("ok")
    } else {
      setMsg("We created a ticket from your feedback.")
      setTicketId(r.data?.created_ticket_id)
      setStatus("created")
    }
  } catch {
    setMsg("Something went wrong. Please try again.")
    setStatus("error")
  }
}

  useEffect(()=>{ if(!token) setMsg("Missing token.") },[token])

  return (
    <div className="container">
      <h1 className="page-title">Confirm fix</h1>
      <div className="card" style={{maxWidth:560}}>
        <p className="muted">Did the solution work?</p>
        <div className="flex">
          <button className="btn-success" onClick={()=>handle(true)}>It worked</button>
          <button className="btn-danger" onClick={()=>handle(false)}>Still broken</button>
        </div>
        {msg && <div className="mt-2">{msg}{status==="created" && ticketId ? <> (Ticket PG-{ticketId})</> : null}</div>}
        <div className="mt-2">
          <a href="/">Go to Ask</a> &nbsp;|&nbsp; <a href="/login">Back to Login</a>
        </div>
      </div>
    </div>
  )
}