import { useEffect, useState } from "react"
import axios from "axios"

const api = axios.create({ baseURL: "/api", timeout: 8000 })

type Notice = {
  id: number
  username: string
  message: string
  type: "info" | "success" | "warn" | "error" | string
  ts: string
  link?: string
}

export default function Dashboard() {
  const p = new URLSearchParams(location.search)
  const user = p.get("user") || "tech2345"

  const [items, setItems] = useState<Notice[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await api.get(`/notifications`, { params: { user } })
      setItems((r.data?.items || []) as Notice[])
    } catch {
      setErr("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000) // auto-refresh every 10s
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fmt = (s: string) => {
    try { return new Date(s).toLocaleString() } catch { return s }
  }

  return (
    <div className="container">
      <h1 className="page-title">Welcome, {user}</h1>

      <div className="card">
        <div className="page-title" style={{ fontSize: 18 }}>Status</div>
        <div className="chip">Problem solved. You are signed in.</div>
        <div className="mt-2">
          <a href="/">Go to Ask</a> &nbsp;|&nbsp; <a href="/login">Back to Login</a>
        </div>
      </div>

      <div className="card mt-2">
        <div className="page-title" style={{ fontSize: 18 }}>Recent notifications</div>

        <div className="flex mt-2">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {err && <span className="chip" style={{ color: "var(--danger)" }}>{err}</span>}
        </div>

        <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }} className="mt-2">
          {(!items || items.length === 0) && (
            <li className="muted">No notifications</li>
          )}
          {items.map(n => (
            <li key={n.id} style={{ borderBottom: "1px dashed var(--border)", padding: "6px 0" }}>
              <span className="badge">{n.type || "info"}</span>{" "}
              {n.message}
              {n.link && (
                <>
                  {" — "}
                  <a href={n.link}>Open</a>
                </>
              )}
              <span className="muted"> — {fmt(n.ts)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}