import React, { useEffect, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
const api = axios.create({ baseURL:"/api", timeout:8000 })

export default function Login(){
  const [username,setUsername]=useState("tech2345")
  const [password,setPassword]=useState("")
  const [msg,setMsg]=useState("")
  const nav=useNavigate()

  // If already logged in, redirect to dashboard (hides Login page completely)
  useEffect(()=>{
    const r = localStorage.getItem("role")
    if(r){ nav(`/dashboard?user=${encodeURIComponent(username||"tech2345")}`, { replace:true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const login=async()=>{
    setMsg("")
    try{
      const r=await api.post("/auth/login",{username,password})
      if(r.data?.ok){
        localStorage.setItem("role", r.data?.role || "user")
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

  // Handle Enter key to login
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") login()
  }

  return (
    <div className="card" style={{maxWidth:480, margin:"0 auto"}}>
      <div className="title" style={{fontSize:22, marginBottom:8}}>Sign in</div>
      <label>Username</label>
      <input
        value={username}
        onChange={e=>setUsername(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
      />
      <label className="mt-2">Password</label>
      <input
        type="password"
        value={password}
        onChange={e=>setPassword(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {msg && <div className="mt-2 chip" style={{color:"var(--red)"}}>{msg}</div>}
      <div className="flex mt-3" style={{gap:8}}>
        <button className="btn" onClick={login}>Login</button>
        <button className="btn-secondary" onClick={reportIssue}>Report issue</button>
      </div>
    </div>
  )
}