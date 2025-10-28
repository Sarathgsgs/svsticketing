import React from "react"
import ReactDOM from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import Shell from "./components/Shell"
import Ask from "./pages/Ask"
import Resolve from "./pages/Resolve"
import Govern from "./pages/Govern"
import Login from "./pages/Login"
import Logout from "./pages/Logout"
import Dashboard from "./pages/Dashboard"
import Confirm from "./pages/Confirm"
import "./index.css"
import ChatBot from "./pages/ChatBot"

function role(){ return localStorage.getItem("role") || "" }
function RoleGate({ roles, children }:{ roles: string[], children: React.ReactNode }) {
  const r = role()
  if (!r || !roles.includes(r)) {
    return (
      <div className="card">
        <div className="title" style={{fontSize:18}}>Access denied</div>
        <div className="muted">Please login as {roles.join(" or ")}.</div>
      </div>
    )
  }
  return <>{children}</>
}

const router = createBrowserRouter([
  { path: "/", element: <Shell>
      <div className="page-head">
        <div><div className="breadcrumb">Service Desk</div><div className="title">Ask</div></div>
      </div>
      <Ask/>
    </Shell> },
  { path: "/resolve", element: <Shell>
      <div className="page-head">
        <div><div className="breadcrumb">Service Desk / Resolve</div><div className="title">Resolve tickets</div></div>
      </div>
      <RoleGate roles={["agent","admin"]}><Resolve/></RoleGate>
    </Shell> },
  { path: "/govern", element: <Shell>
      <div className="page-head">
        <div><div className="breadcrumb">Administration / Govern</div><div className="title">Govern</div></div>
      </div>
      <RoleGate roles={["admin"]}><Govern/></RoleGate>
    </Shell> },
  { path: "/login", element: <Shell>
      <div className="page-head"><div className="breadcrumb">Auth</div><div className="title">Login</div></div>
      <Login/>
    </Shell> },
  { path: "/logout", element: <Shell>
      <Logout/>
    </Shell> },
  { path: "/dashboard", element: <Shell>
      <div className="page-head"><div className="breadcrumb">Home</div><div className="title">Dashboard</div></div>
      <Dashboard/>
    </Shell> },
    
  { path: "/confirm", element: <Shell>
      <div className="page-head"><div className="breadcrumb">Notifications</div><div className="title">Confirm fix</div></div>
      <Confirm/>
    </Shell> },
    { path: "/chatbot", element: <Shell>
    <div className="page-head"><div className="breadcrumb">Service Desk</div><div className="title">ChatBot</div></div>
    <ChatBot/>
  </Shell> },
])
  
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><RouterProvider router={router}/></React.StrictMode>
)