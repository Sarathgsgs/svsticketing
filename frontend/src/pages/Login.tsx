import { useEffect, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
const api = axios.create({ baseURL:"/api", timeout:8000 })

export default function Login(){
  const [username,setUsername]=useState("tech2345")
  const [password,setPassword]=useState("")
  const [msg,setMsg]=useState("")
  const nav=useNavigate()

  // Clear any stale role so users can't see protected pages without logging in
  useEffect(()=>{ localStorage.removeItem("role") },[])

  const login=async()=>{ setMsg("")
    try{
      const r=await api.post("/auth/login",{username,password})
      if(r.data?.ok){
        const role = r.data?.role || "user"
        localStorage.setItem("role", role)
        nav(`/dashboard?user=${encodeURIComponent(username)}`)
      }else{
        const reason = r.data?.reason
        if(reason==="locked") setMsg("Account locked. Click 'Report issue'.")
        else if(reason==="bad_password") setMsg("Incorrect password.")
        else if(reason==="user_not_found") setMsg("User not found.")
        else setMsg("Login failed.")
      }
    }catch{ setMsg("Server not reachable.") }
  }

  const reportIssue=()=>{ 
    const s="Password unlock"
    const b=`User ${username} unable to login; MFA code expired.`
    location.href=`/?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}&username=${encodeURIComponent(username)}`
  }

  return (
    <div className="container">
      <h1 className="page-title">Login</h1>
      <div className="card" style={{maxWidth:480}}>
        <label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)}/>
        <label className="mt-2">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)}/>
        {msg && <div className="mt-2 chip">{msg}</div>}
        <div className="flex mt-3">
          <button className="btn" onClick={login}>Login</button>
          <button className="btn-secondary" onClick={reportIssue}>Report issue</button>
        </div>
        <div className="mt-2 muted">
          Demo accounts — user: tech2345 / user123, agent: agent1 / agent123, admin: admin1 / admin123
        </div>
      </div>
    </div>
  )
}