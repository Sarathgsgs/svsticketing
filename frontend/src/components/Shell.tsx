import React, { type ReactNode } from "react"
import { Link, NavLink } from "react-router-dom"

function RolePill() {
  const role = localStorage.getItem("role") || "guest"
  return <span className="chip">Role: {role}</span>
}

export default function Shell({ children }: { children: ReactNode }) {
  const role = localStorage.getItem("role") || ""
  const loggedIn = !!role
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="dot" /> TicketPilot</div>
        <div className="nav">
          <NavLink to="/" className={({isActive})=>isActive?"active":""}>Service Desk</NavLink>
          {["agent","admin"].includes(role) && <NavLink to="/resolve" className={({isActive})=>isActive?"active":""}>Resolve</NavLink>}
          {role==="admin" && <NavLink to="/govern" className={({isActive})=>isActive?"active":""}>Govern</NavLink>}
          {!loggedIn && <NavLink to="/login" className={({isActive})=>isActive?"active":""}>Login</NavLink>}
        </div>
      </aside>
      <div style={{display:"grid", gridTemplateRows:"52px 1fr"}}>
        <header className="topbar">
          <div className="search"><input placeholder="Search tickets, KB, users..." /></div>
          <div className="header-right">
            <RolePill />
            {loggedIn && <Link to="/logout" className="btn-secondary">Logout</Link>}
          </div>
        </header>
        <main className="content"><div className="page">{children}</div></main>
      </div>
    </div>
  )
}