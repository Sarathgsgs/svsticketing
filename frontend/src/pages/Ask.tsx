import React, { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react"
import axios from "axios"

const api = axios.create({ baseURL: "/api", timeout: 12000 })

type LocalImage = { file: File; preview: string; ocr?: string; error?: string }

export default function Ask() {
  // Form state
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [reportUser, setReportUser] = useState<string>("")

  // AI + fixes
  const [result, setResult] = useState<any>(null)
  const [fixes, setFixes] = useState<any[]>([])
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [cfg, setCfg] = useState<any>({ auto_resolve_threshold: { triage: 0.6, kb: 0.6 } })

  // UI state
  const [images, setImages] = useState<LocalImage[]>([])
  const [loading, setLoading] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [fixing, setFixing] = useState<string | null>(null)
  const [warmed, setWarmed] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        await api.get("/metrics", { timeout: 6000 })
        await api.post("/triage", { subject: "warmup", body: "warmup" }, { timeout: 12000 })
        setWarmed(true)
      } catch { setWarmed(false) }

      try {
        const c = await api.get("/admin/config")
        setCfg(c.data)
      } catch {}

      const p = new URLSearchParams(window.location.search)
      const s = p.get("subject"); const b = p.get("body"); const u = p.get("username")
      if (s) setSubject(s)
      if (b) setBody(b)
      if (u) setReportUser(u || "")
    })()
  }, [])

  const pickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const fl = e.currentTarget.files
    if (!fl || fl.length === 0) return
    const arr: File[] = Array.from(fl)
    const imgs = arr
      .filter((file) => (file.type || "").startsWith("image/"))
      .slice(0, 3)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setImages((prev) => [...prev, ...imgs])
    e.currentTarget.value = ""
  }

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const c = [...prev]
      const url = c[idx]?.preview
      if (url) URL.revokeObjectURL(url)
      c.splice(idx, 1)
      return c
    })
  }

  const ocrImage = async (idx: number) => {
    const img = images[idx]
    if (!img) return
    setOcrBusy(true)
    try {
      const { default: Tesseract } = await import("tesseract.js")
      const { data } = await Tesseract.recognize(img.file, "eng", { logger: () => {} })
      const text = (data?.text || "").trim()
      setImages((prev) => {
        const c = [...prev]
        c[idx] = { ...c[idx], ocr: text }
        return c
      })
      if (text) setBody((prev) => (prev ? `${prev}\n\n[OCR]\n${text}` : `[OCR]\n${text}`))
    } catch {
      setImages((prev) => {
        const c = [...prev]
        c[idx] = { ...c[idx], error: "OCR failed" }
        return c
      })
    } finally {
      setOcrBusy(false)
    }
  }

  const triage = async () => {
    if (!subject && !body) { alert("Enter subject or details."); return }
    setLoading(true); setResult(null); setFixes([]); setDuplicates([])
    try {
      const triTimeout = warmed ? 8000 : 20000
      let triRes
      try {
        triRes = await api.post("/triage", { subject, body }, { timeout: triTimeout })
      } catch (e: any) {
        if (e.code === "ECONNABORTED" && triTimeout < 20000) {
          triRes = await api.post("/triage", { subject, body }, { timeout: 20000 })
        } else { throw e }
      }
      setResult(triRes.data)
      setDuplicates(triRes.data?.duplicates || [])
      setWarmed(true)
      try {
        const fx = await api.post("/fixes/suggest", { subject, body }, { timeout: 6000 })
        setFixes(fx.data?.fixes || [])
      } catch { setFixes([]) }
    } catch (e: any) {
      alert("Suggest Fix failed or timed out. Ensure backend is running.")
      console.error(e)
    } finally { setLoading(false) }
  }

  const fileToDataUrl = (file: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(file)
    })

  const createTicket = async () => {
    try {
      const attachments: { filename: string; data_url: string }[] = []
      for (const img of images) {
        const dataUrl = await fileToDataUrl(img.file)
        attachments.push({ filename: img.file.name, data_url: dataUrl })
      }
      const r = await api.post("/tickets", { subject, body, attachments }, { timeout: 12000, maxContentLength: 20 * 1024 * 1024 })
      alert(`Ticket PG-${r.data.id} created`)
      resetForm()
    } catch (e: any) {
      alert("Failed to create ticket")
      console.error(e)
    }
  }

  const runFix = async (fid: string) => {
    setFixing(fid)
    try {
      const r = await api.post("/fixes/execute", { fix_id: fid, subject, body, username: reportUser }, { timeout: 12000 })
      if (r.data?.ok) { alert("Auto fix ran (simulated) and was marked resolved."); resetForm() }
      else alert("Fix did not run.")
    } catch (e: any) {
      alert("Failed to run fix")
      console.error(e)
    } finally { setFixing(null) }
  }

  const deflect = async () => {
    try {
      await api.post("/deflect", { subject, body, article_doc_id: result?.kb?.[0]?.doc_id || null }, { timeout: 8000 })
      alert("Resolved without ticket."); resetForm()
    } catch {
      alert("Deflect failed")
    }
  }

  const resetForm = () => {
    setSubject("")
    setBody("")
    setResult(null)
    setFixes([])
    setDuplicates([])
    images.forEach((i) => URL.revokeObjectURL(i.preview))
    setImages([])
  }

  const conf = Math.round(((result?.triage?.confidence || 0) * 100))
  const kbTopScore = result?.kb?.[0]?.score || 0
  const canAutoResolve =
    (result?.triage?.confidence || 0) >= (cfg?.auto_resolve_threshold?.triage || 0.6) &&
    kbTopScore >= (cfg?.auto_resolve_threshold?.kb || 0.6)

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { triage() }
  }

  const stepDescribe = !!(subject || body)
  const stepScreenshot = images.length > 0 || images.some(i => i.ocr)
  const stepSuggest = !!result
  const stepResolve = canAutoResolve || (fixes && fixes.length > 0)

  return (
    <>
      {/* Guided strip */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="chip" style={{ borderColor: stepDescribe ? "var(--green)" : "var(--border)" }}>
            1. Describe
          </span>
          <span className="chip" style={{ borderColor: stepScreenshot ? "var(--green)" : "var(--border)" }}>
            2. Screenshot (optional)
          </span>
          <span className="chip" style={{ borderColor: stepSuggest ? "var(--green)" : "var(--border)" }}>
            3. Suggest Fix
          </span>
          <span className="chip" style={{ borderColor: stepResolve ? "var(--green)" : "var(--border)" }}>
            4. Resolve or Create Ticket
          </span>
          <span className="muted">Tip: Press Ctrl+Enter to suggest fix</span>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Left: form */}
        <div className="card">
          <label>Subject</label>
          <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={onKeyDown} />

          <label className="mt-2">Details</label>
          <textarea placeholder="Describe your issue..." value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={onKeyDown} />

          <div className="mt-2">
            <label>Screenshot(s)</label>
            <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 12 }}>
              <input type="file" accept="image/*" multiple onChange={pickFiles} />
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {images.map((img, idx) => (
                  <div key={idx} className="card" style={{ padding: 8, width: 170 }}>
                    <img src={img.preview} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button className="btn-secondary" onClick={() => ocrImage(idx)} disabled={ocrBusy}>
                        {ocrBusy ? "OCR..." : "Extract text"}
                      </button>
                      <button className="btn-danger" onClick={() => removeImage(idx)}>Remove</button>
                    </div>
                    {img.ocr && <div className="mt-1 chip">OCR OK</div>}
                    {img.error && <div className="mt-1 chip" style={{ color: "var(--red)" }}>OCR failed</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn" onClick={triage} disabled={loading || ocrBusy}>{loading ? "Thinking..." : "Suggest Fix"}</button>
            <button className="btn-secondary" onClick={createTicket} disabled={ocrBusy}>Create Ticket</button>
            {result && canAutoResolve && (
              <button className="btn-success" onClick={() => fixes[0]?.id ? runFix(fixes[0].id) : deflect()} disabled={!!fixing || ocrBusy}>
                {fixing ? "Running..." : "Resolve without ticket"}
              </button>
            )}
            <button className="btn-secondary" onClick={resetForm}>Clear</button>
          </div>
        </div>

        {/* Right: AI results */}
        <div className="card">
          {!result ? (
            <div className="muted">Run "Suggest Fix" to see prediction, KB, quick fixes, and duplicates.</div>
          ) : (
            <>
              {/* Prediction */}
              <div style={{ marginBottom: 10 }}>
                <div className="title" style={{ fontSize: 18 }}>Prediction</div>
                <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  Service: <span className="badge">{result.triage.service}</span>{" "}{'->'}{" "}
                  <span className="badge">{result.triage.assignment_group}</span>
                  <span className="chip">Priority {result.triage.priority}</span>
                  <span className="chip">conf {conf}%</span>
                  {result.context?.blast_radius?.users_affected ? (
                    <span className="chip">Blast radius: {result.context.blast_radius.users_affected} users</span>
                  ) : null}
                  {result.context?.recent_change ? (
                    <span className="chip">Recent change: {result.context.recent_change.desc || "change"}</span>
                  ) : null}
                </div>
                {/* Confidence meter */}
                <div style={{ marginTop: 8, background: "rgba(255,255,255,.06)", border: "1px solid var(--border)", borderRadius: 8, height: 10, overflow: "hidden" }}>
                  <div style={{
                    width: `${conf}%`,
                    height: "100%",
                    background: conf >= 80 ? "var(--green)" : conf >= 60 ? "var(--amber)" : "var(--accent)",
                    transition: "width .2s ease"
                  }}/>
                </div>
                {/* Rationale */}
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(result.triage.rationale || []).map((r: string, i: number) => <span key={i} className="chip">{r}</span>)}
                  {result.top_kb && <span className="chip">KB: {result.top_kb}</span>}
                </div>
              </div>

              {/* KB */}
              <div style={{ marginTop: 10 }}>
                <div className="title" style={{ fontSize: 18 }}>Top Articles</div>
                <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
                  {result.kb.map((k: any, i: number) => (
                    <li key={i} style={{ borderBottom: "1px dashed var(--border)", padding: "6px 0" }}>
                      <div><b>{k.title}</b> <span className="muted">({k.score.toFixed(2)})</span></div>
                      <div className="muted">{(k.chunk || "").slice(0, 180)}...</div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Fixes */}
              {fixes.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="title" style={{ fontSize: 18 }}>Quick Fixes</div>
                  <div className="grid">
                    {fixes.map((f: any) => (
                      <div key={f.id} className="card">
                        <div><b>{f.title}</b></div>
                        <div className="muted">{f.description}</div>
                        <ol style={{ marginLeft: 16 }}>{f.steps.map((s: string, idx: number) => <li key={idx}>{s}</li>)}</ol>
                        <button className="btn-success" onClick={() => runFix(f.id)} disabled={!!fixing}>
                          {fixing === f.id ? "Running..." : "Run Auto Fix (simulated)"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {duplicates.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="title" style={{ fontSize: 18 }}>Possible duplicates</div>
                  <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
                    {duplicates.map((d: any) => (
                      <li key={d.ticket_id} style={{ padding: "6px 0", borderBottom: "1px dashed var(--border)" }}>
                        PG-{d.ticket_id} · similarity {Math.round((d.similarity || 0) * 100)}%
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}