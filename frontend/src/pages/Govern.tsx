import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
  PieChart, Pie, Cell,
  RadialBarChart, RadialBar, Legend
} from "recharts"

const api = axios.create({ baseURL: "/api", timeout: 8000 })

type SeriesPoint = { ts: string; total: number; by_service?: Record<string, number> }

const COLORS = {
  accent: "#60a5fa",
  accent600: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#60a5fa",
  purple: "#a78bfa",
  teal: "#2dd4bf",
  cyan: "#22d3ee",
  yellow: "#fde047",
}

export default function Govern() {
  const [metrics, setMetrics] = useState<any>({})
  const [cfg, setCfg] = useState<any>({ auto_resolve_threshold: { triage: 0.6, kb: 0.6 }, dedup_similarity: 0.8 })
  const [busy, setBusy] = useState(false)
  const [approvals, setApprovals] = useState<any[]>([])
  const [spikes, setSpikes] = useState<any[]>([])
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [breakdown, setBreakdown] = useState<{ service: Record<string, number>, priority: Record<string, number>, status: Record<string, number> } | null>(null)
  const [openTickets, setOpenTickets] = useState<any[]>([])

  // Load data
  const load = async () => {
    const m = await api.get("/metrics"); setMetrics(m.data)
    const c = await api.get("/admin/config"); setCfg(c.data)
  }
  const loadApprovals = async () => { const r = await api.get("/approvals"); setApprovals(r.data?.items || []) }
  const loadSpikes = async () => { const r = await api.get("/spikes"); setSpikes(r.data?.items || []) }
  const loadSeries = async () => { const r = await api.get("/metrics/series", { params: { hours: 24 } }); setSeries(r.data?.items || []) }
  const loadBreakdown = async () => { const r = await api.get("/metrics/breakdown"); setBreakdown(r.data || null) }
  const loadOpen = async () => { const r = await api.get("/tickets", { params: { status: "open" } }); setOpenTickets(r.data || []) }

  useEffect(() => {
    load()
    loadApprovals()
    loadSpikes()
    loadSeries()
    loadBreakdown()
    loadOpen()
  }, [])

  // Actions
  const saveCfg = async () => { await api.post("/admin/config", cfg); alert("Saved") }
  const retriage = async () => { setBusy(true); const r = await api.post("/admin/retriage"); alert(`Re-triaged ${r.data.updated}`); setBusy(false); load() }
  const setTri = (v: number) => setCfg((p: any) => ({ ...p, auto_resolve_threshold: { ...p.auto_resolve_threshold, triage: v } }))
  const setKb = (v: number) => setCfg((p: any) => ({ ...p, auto_resolve_threshold: { ...p.auto_resolve_threshold, kb: v } }))
  const setDup = (v: number) => setCfg((p: any) => ({ ...p, dedup_similarity: v }))

  const approve = async (id: number, ok: boolean) => { await api.post("/actions/decision", { id, approved: ok, reviewer: "admin1" }); await loadApprovals() }
  const resetDemo = async () => { await api.post("/demo/reset", {}); alert("Demo reset: user re-locked and notifications cleared.") }

  // Derived data
  const serviceBars = useMemo(() => {
    if (!breakdown?.service) return []
    const entries = Object.entries(breakdown.service).map(([k, v]) => ({ key: k, value: v as number }))
    entries.sort((a, b) => b.value - a.value)
    return entries.slice(0, 6)
  }, [breakdown])

  const statusPie = useMemo(() => {
    const st = breakdown?.status || {}
    return Object.entries(st).map(([name, value]) => ({ name, value }))
  }, [breakdown])

  const riskPct = useMemo(() => {
    if (!openTickets || openTickets.length === 0) return 0
    const hi = openTickets.filter((t) => (t.risk || 0) > 0.75).length
    return Math.round((hi / openTickets.length) * 100)
  }, [openTickets])

  const lineData = useMemo(() => {
    return series.map((d) => {
      let label = "?"
      try {
        const dt = new Date(d.ts)
        label = dt.toLocaleTimeString([], { hour: "2-digit" })
      } catch { /* ignore */ }
      return { label, total: d.total || 0 }
    })
  }, [series])

  const pieColors = [COLORS.blue, COLORS.green, COLORS.amber, COLORS.purple, COLORS.teal, COLORS.cyan, COLORS.yellow]

  return (
    <>
      {/* KPIs + Policy */}
      <div className="grid-auto">
        <div className="card">
          <div className="breadcrumb">Service Desk</div>
          <div className="title">Metrics</div>
          <div className="grid-auto" style={{ marginTop: 10 }}>
            <div className="card"><div className="muted">Tickets</div><div className="title" style={{ fontSize: 22 }}>{metrics.tickets ?? "-"}</div></div>
            <div className="card"><div className="muted">Deflections</div><div className="title" style={{ fontSize: 22 }}>{metrics.deflections ?? "-"}</div></div>
            <div className="card"><div className="muted">Merged</div><div className="title" style={{ fontSize: 22 }}>{metrics.merged ?? "-"}</div></div>
            <div className="card"><div className="muted">Resolved</div><div className="title" style={{ fontSize: 22 }}>{metrics.resolved ?? "-"}</div></div>
          </div>
        </div>

        <div className="card">
          <div className="breadcrumb">Policy</div>
          <div className="title">Auto-resolve thresholds</div>
          <div className="grid grid-2" style={{ marginTop: 10 }}>
            <div>
              <label>Triage threshold</label>
              <input type="range" min="0" max="1" step="0.05" value={cfg?.auto_resolve_threshold?.triage || 0.6} onChange={e => setTri(Number(e.target.value))} />
              <div>{(cfg?.auto_resolve_threshold?.triage || 0.6).toFixed(2)}</div>
            </div>
            <div>
              <label>KB score threshold</label>
              <input type="range" min="0" max="1" step="0.05" value={cfg?.auto_resolve_threshold?.kb || 0.6} onChange={e => setKb(Number(e.target.value))} />
              <div>{(cfg?.auto_resolve_threshold?.kb || 0.6).toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-1">
            <label>Dedup similarity</label>
            <input type="range" min="0" max="1" step="0.05" value={cfg?.dedup_similarity || 0.8} onChange={e => setDup(Number(e.target.value))} />
            <div>{(cfg?.dedup_similarity || 0.8).toFixed(2)}</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={saveCfg} disabled={busy}>Save</button>
            <button className="btn-secondary" onClick={retriage} disabled={busy}>{busy ? "Re-triaging..." : "Re-triage"}</button>
            <button className="btn-danger" onClick={resetDemo}>Reset demo</button>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-auto" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="breadcrumb">Analytics</div>
          <div className="title">Tickets per hour (last 24h)</div>
          <div className="chartBox" style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" />
                <XAxis dataKey="label" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }}
                  cursor={{ stroke: "rgba(255,255,255,.1)" }}
                />
                <Line type="monotone" dataKey="total" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="breadcrumb">Analytics</div>
          <div className="title">Tickets by service</div>
          <div className="chartBox" style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceBars} layout="vertical" margin={{ left: 40, right: 16, top: 10, bottom: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,.05)" />
                <XAxis type="number" stroke="var(--muted)" allowDecimals={false} />
                <YAxis type="category" dataKey="key" stroke="var(--muted)" width={120} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <Bar dataKey="value" fill={COLORS.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Status + SLA risk */}
      <div className="grid-auto" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="breadcrumb">Analytics</div>
          <div className="title">Status breakdown</div>
          <div className="chartBox" style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius="70%" innerRadius="45%">
                  {statusPie.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Legend verticalAlign="bottom" height={24} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="breadcrumb">Risk</div>
          <div className="title">Open tickets at high risk</div>
          <div className="chartBox" style={{ marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="60%" outerRadius="90%" data={[{ name: "High risk", value: riskPct }]}>
                <RadialBar minAngle={15} clockWise dataKey="value" fill={riskPct >= 50 ? COLORS.red : COLORS.green} />
                <Legend content={() => <div style={{ textAlign: "center", color: "var(--text)" }}>{riskPct}% of open tickets</div>} />
                <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Approvals + Spikes */}
      <div className="grid-auto" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="breadcrumb">Operations</div>
          <div className="title">Approvals</div>
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0, marginTop: 10 }}>
            {approvals.length === 0 && <li className="muted">No approvals</li>}
            {approvals.map(a => (
              <li key={a.id} style={{ borderBottom: "1px dashed var(--border)", padding: "6px 0" }}>
                #{a.id} · {a.action_id} · <b>{a.status}</b> · by {a.requested_by}
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <button className="btn-success" onClick={() => approve(a.id, true)}>Approve</button>
                  <button className="btn-danger" onClick={() => approve(a.id, false)}>Deny</button>
                </div>
                {a.logs && a.logs.length > 0 && <div className="mt-1 muted">{a.logs.join(" | ")}</div>}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="breadcrumb">Analytics</div>
          <div className="title">Live spikes (last hour)</div>
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0, marginTop: 10 }}>
            {spikes.length === 0 && <li className="muted">No spikes detected</li>}
            {spikes.map((s, i) => (
              <li key={i}>Service <b>{s.service}</b> · count {s.count} in {s.window_min} min</li>
            ))}
          </ul>
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={loadSpikes}>Refresh</button>
        </div>
      </div>
    </>
  )
}