import { useEffect, useState } from "react"
import axios from "axios"

const api = axios.create({ baseURL: "/api", timeout: 12000 })

type LocalImage = { file: File; preview: string; ocr?: string; error?: string }

export default function Ask(){
  const [subject,setSubject]=useState("")
  const [body,setBody]=useState("")
  const [result,setResult]=useState<any>(null)
  const [fixes,setFixes]=useState<any[]>([])
  const [loading,setLoading]=useState(false)
  const [fixing,setFixing]=useState<string|null>(null)
  const [cfg,setCfg]=useState<any>({ auto_resolve_threshold:{triage:0.6,kb:0.6} })
  const [images,setImages]=useState<LocalImage[]>([])
  const [ocrBusy,setOcrBusy]=useState(false)
  const [reportUser,setReportUser]=useState<string>("")
  const [warmed,setWarmed]=useState(false)

  useEffect(()=>{ (async()=>{
    try{ await api.get("/metrics",{timeout:6000}); await api.post("/triage",{subject:"warmup",body:"warmup"},{timeout:12000}); setWarmed(true) }catch{ setWarmed(false) }
    try{ const c=await api.get("/admin/config"); setCfg(c.data) }catch{}
    const p=new URLSearchParams(location.search)
    const s=p.get("subject"); const b=p.get("body"); const u=p.get("username")
    if(s) setSubject(s); if(b) setBody(b); if(u) setReportUser(u||"")
  })() },[])

  const pickFiles=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const files=Array.from(e.target.files||[])
    const imgs=files.filter(f=>f.type.startsWith("image/")).slice(0,3).map(f=>({file:f,preview:URL.createObjectURL(f)}))
    setImages(p=>[...p,...imgs]); e.currentTarget.value=""
  }
  const removeImage=(i:number)=>{ setImages(p=>{const c=[...p]; const url=c[i]?.preview; if(url) URL.revokeObjectURL(url); c.splice(i,1); return c}) }
  const ocrImage=async(i:number)=>{ const img=images[i]; if(!img) return; setOcrBusy(true)
    try{ const {default:Tesseract}=await import("tesseract.js"); const {data}=await Tesseract.recognize(img.file,"eng",{logger:()=>{}}); const text=(data?.text||"").trim()
      setImages(p=>{const c=[...p]; c[i]={...c[i],ocr:text}; return c}); if(text) setBody(prev=>prev?`${prev}\n\n[OCR]\n${text}`:`[OCR]\n${text}`)
    }catch{ setImages(p=>{const c=[...p]; c[i]={...c[i],error:"OCR failed"}; return c}) } finally{ setOcrBusy(false) } }

  const triage=async()=>{ if(!subject && !body){ alert("Enter subject or details."); return }
    setLoading(true); setResult(null); setFixes([])
    try{
      const triTimeout=warmed?8000:20000
      let triRes; try{ triRes=await api.post("/triage",{subject,body},{timeout:triTimeout}) }
      catch(e:any){ if(e.code==="ECONNABORTED" && triTimeout<20000){ triRes=await api.post("/triage",{subject,body},{timeout:20000}) } else { throw e } }
      setResult(triRes.data); setWarmed(true)
      try{ const fx=await api.post("/fixes/suggest",{subject,body},{timeout:6000}); setFixes(fx.data?.fixes||[]) }catch{ setFixes([]) }
    }catch(e:any){ alert("Suggest Fix failed or timed out. Ensure backend is running."); console.error(e) } finally{ setLoading(false) }
  }

  const fileToDataUrl=(file:File)=> new Promise<string>((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(file) })
  const createTicket=async()=>{ try{
      const attachments=[] as {filename:string,data_url:string}[]
      for(const img of images){ const dataUrl=await fileToDataUrl(img.file); attachments.push({filename:img.file.name,data_url:dataUrl}) }
      const r=await api.post("/tickets",{subject,body,attachments},{timeout:12000,maxContentLength:20*1024*1024})
      alert(`Ticket PG-${r.data.id} created`); setSubject(""); setBody(""); setResult(null); setFixes([]); setImages([])
    }catch(e:any){ alert("Failed to create ticket"); console.error(e) } }

  const runFix=async(fid:string)=>{ setFixing(fid)
    try{
      const r=await api.post("/fixes/execute",{fix_id:fid,subject,body,username:reportUser},{timeout:12000})
      if(r.data?.ok){ alert("Auto fix ran (simulated) and was marked resolved."); setSubject(""); setBody(""); setResult(null); setFixes([]); setImages([]) }
      else alert("Fix did not run.")
    }catch(e:any){ alert("Failed to run fix"); console.error(e) } finally{ setFixing(null) } }

  const deflect=async()=>{ try{
      await api.post("/deflect",{subject,body,article_doc_id:result?.kb?.[0]?.doc_id||null},{timeout:8000})
      alert("Resolved without ticket."); setSubject(""); setBody(""); setResult(null); setFixes([]); setImages([])
    }catch{ alert("Deflect failed") } }

  const kbTopScore=result?.kb?.[0]?.score || 0
  const canAutoResolve=(result?.triage?.confidence||0)>=(cfg?.auto_resolve_threshold?.triage||0.6) && kbTopScore>=(cfg?.auto_resolve_threshold?.kb||0.6)

  return (
    <div className="container">
      <h1 className="page-title">Ask</h1>
      <p className="mt-1 muted">Describe your issue. Attach a screenshot and extract text for better routing.</p>
      <div className="grid grid-2">
        <div className="card">
          <label>Subject</label>
          <input placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)}/>
          <label className="mt-2">Details</label>
          <textarea placeholder="Describe your issue..." value={body} onChange={e=>setBody(e.target.value)}/>
          <div className="mt-2">
            <label>Screenshot(s)</label>
            <div style={{border:"1px dashed var(--border)",borderRadius:10,padding:12}}>
              <input type="file" accept="image/*" multiple onChange={pickFiles}/>
              <div className="flex mt-2">
                {images.map((img,idx)=>(
                  <div key={idx} className="card" style={{padding:8,width:160}}>
                    <img src={img.preview} style={{width:"100%",borderRadius:8,border:"1px solid var(--border)"}}/>
                    <div className="mt-1">
                      <button className="btn-secondary" onClick={()=>ocrImage(idx)} disabled={ocrBusy}>{ocrBusy?"OCR...":"Extract text"}</button>
                      <button className="btn-danger" onClick={()=>removeImage(idx)} style={{marginLeft:6}}>Remove</button>
                    </div>
                    {img.ocr && <div className="mt-1 chip">OCR OK</div>}
                    {img.error && <div className="mt-1 chip">OCR failed</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex mt-3">
            <button className="btn" onClick={triage} disabled={loading||ocrBusy}>{loading?"Thinking...":"Suggest Fix"}</button>
            <button className="btn-secondary" onClick={createTicket} disabled={ocrBusy}>Create Ticket</button>
            {result && canAutoResolve && (
              <button className="btn-success" onClick={()=>fixes[0]?.id?runFix(fixes[0].id):deflect()} disabled={!!fixing||ocrBusy}>
                {fixing?"Running...":"Resolve without ticket"}
              </button>
            )}
          </div>
        </div>
        <div className="card">
          {!result? <div className="muted">Run "Suggest Fix" to see predictions, KB, and quick fixes.</div> :
          <>
            <div className="page-title" style={{fontSize:18}}>Prediction</div>
            <div className="muted">
              Service: <span className="badge">{result.triage.service}</span>{" "}{'->'}{" "}
              <span className="badge">{result.triage.assignment_group}</span>{" "}
              <span className="chip">Priority {result.triage.priority}</span>{" "}
              <span className="chip">conf {Math.round((result.triage.confidence||0)*100)}%</span>
            </div>
            <div className="mt-2">
              {(result.triage.rationale||[]).map((r:string,i:number)=><span key={i} className="chip">{r}</span>)}
              {result.top_kb && <span className="chip">KB: {result.top_kb}</span>}
            </div>
            <div className="mt-3">
              <div className="page-title" style={{fontSize:18}}>Top Articles</div>
              <ul style={{margin:0,paddingLeft:0,listStyle:"none"}}>
                {result.kb.map((k:any,i:number)=>(
                  <li key={i} style={{borderBottom:"1px dashed var(--border)",padding:"6px 0"}}>
                    <div><b>{k.title}</b> <span className="muted">({k.score.toFixed(2)})</span></div>
                    <div className="muted">{(k.chunk||"").slice(0,180)}...</div>
                  </li>
                ))}
              </ul>
            </div>
            {fixes.length>0 && (
              <div className="mt-3">
                <div className="page-title" style={{fontSize:18}}>Quick Fixes</div>
                <div className="grid">
                  {fixes.map((f:any)=>(
                    <div key={f.id} className="card">
                      <div><b>{f.title}</b></div>
                      <div className="muted">{f.description}</div>
                      <ol style={{marginLeft:16}}>{f.steps.map((s:string,idx:number)=><li key={idx}>{s}</li>)}</ol>
                      <button className="btn-success" onClick={()=>runFix(f.id)} disabled={!!fixing}>
                        {fixing===f.id?"Running...":"Run Auto Fix (simulated)"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}
        </div>
      </div>
    </div>
  )
}