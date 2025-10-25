import React from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, RouterProvider, Link } from "react-router-dom"
import Ask from "./pages/Ask"
import Resolve from "./pages/Resolve"
import Govern from "./pages/Govern"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Logout from "./pages/Logout"  // NEW
import "./index.css"

function role(){ return localStorage.getItem("role") || "" }

function RoleGate({ roles, children }:{roles:string[], children:React.ReactNode}){
  const r = role()
  if(!r || !roles.includes(r)){
    return (
      <div className="container">
        <div className="card">
          <div className="page-title">Access denied</div>
          <div className="muted">Please login as {roles.join(" or ")}.</div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

function Layout({ children }:{children:React.ReactNode}){
  const r = role()
  const loggedIn = !!r
  return (
    <div>
      <div className="nav">
        <div className="nav-inner">
          <Link to="/">Ask</Link>
          {["agent","admin"].includes(r) && <Link to="/resolve">Resolve</Link>}
          {r==="admin" && <Link to="/govern">Govern</Link>}
          {!loggedIn && <Link to="/login">Login</Link>}
          {loggedIn && (
            <>
              <span className="chip">Role: {r}</span>
              <Link to="/logout">Logout</Link>
            </>
          )}
        </div>
      </div>
      <main className="container">{children}</main>
    </div>
  )
}

const router = createBrowserRouter([
  { path: "/", element: <Layout><Ask/></Layout> },
  { path: "/resolve", element: <Layout><RoleGate roles={["agent","admin"]}><Resolve/></RoleGate></Layout> },
  { path: "/govern", element: <Layout><RoleGate roles={["admin"]}><Govern/></RoleGate></Layout> },
  { path: "/login", element: <Layout><Login/></Layout> },
  { path: "/logout", element: <Layout><Logout/></Layout> },  // NEW
  { path: "/dashboard", element: <Layout><Dashboard/></Layout> },
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><RouterProvider router={router}/></React.StrictMode>
)