import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function Logout(){
  const nav = useNavigate()
  useEffect(() => {
    localStorage.removeItem("role")
    nav("/login", { replace: true })
  }, [nav])
  return (
    <div className="container">
      <div className="card">
        <div className="page-title" style={{fontSize:18}}>Signing out…</div>
      </div>
    </div>
  )
}