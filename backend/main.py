from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import services, store, fixes, assist

app = FastAPI(title="POWERGRID Ops API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class Attachment(BaseModel):
    filename: str
    data_url: str

class CreateTicket(BaseModel):
    subject: str
    body: str
    attachments: Optional[List[Attachment]] = None

class DeflectPayload(BaseModel):
    subject: str
    body: str
    article_doc_id: Optional[int] = None

class MergePayload(BaseModel):
    source_id: int
    duplicate_ids: List[int]

class StatusPayload(BaseModel):
    ticket_id: int
    status: str

class FixSuggestPayload(BaseModel):
    subject: str
    body: str

class FixExecutePayload(BaseModel):
    fix_id: str
    subject: Optional[str] = ""
    body: Optional[str] = ""
    username: Optional[str] = None

class AssistPayload(BaseModel):
    subject: str
    body: str

class LoginPayload(BaseModel):
    username: str
    password: str

class UnlockPayload(BaseModel):
    username: str

class NotifyPayload(BaseModel):
    username: str
    message: str
    type: Optional[str] = "info"

@app.post("/api/triage")
def api_triage(payload: CreateTicket):
    textq = f"{payload.subject}\n{payload.body}".strip()
    tri = services.classify(textq)
    hits = store.kb_search(textq, k=3)
    dupes = store.dedup(textq, k=3)
    top_kb = hits[0]["title"] if hits else None
    return {"triage": tri, "kb": hits, "duplicates": dupes, "top_kb": top_kb}

@app.post("/api/tickets")
def api_create_ticket(payload: CreateTicket):
    textq = f"{payload.subject}\n{payload.body}".strip()
    tri = services.classify(textq)
    t = store.add_ticket(payload.subject, payload.body, tri, attachments=[a.dict() for a in (payload.attachments or [])])
    dupes = store.dedup(textq, k=3)
    return {"id": t["id"], "triage": tri, "duplicates": dupes}

@app.get("/api/tickets")
def api_list_tickets(q: Optional[str] = None, service: Optional[str] = None, status: Optional[str] = None, sort: Optional[str] = None):
    return store.list_tickets(q=q, service=service, status=status, sort=sort)

@app.post("/api/tickets/merge")
def api_merge(payload: MergePayload):
    return store.merge_tickets(payload.source_id, payload.duplicate_ids)

@app.post("/api/tickets/status")
def api_status(payload: StatusPayload):
    t = store.update_ticket_status(payload.ticket_id, payload.status)
    return {"ok": bool(t), "ticket": t}

@app.get("/api/tickets/similar/{ticket_id}")
def api_similar(ticket_id: int, k: int = 3):
    return store.similar_to_ticket(ticket_id, k=k)

@app.post("/api/deflect")
def api_deflect(payload: DeflectPayload):
    store.add_deflection(payload.subject, payload.body, payload.article_doc_id)
    return {"ok": True}

@app.get("/api/metrics")
def api_metrics():
    return store.metrics()

@app.get("/api/admin/config")
def api_get_config():
    return store.load_config()

@app.post("/api/admin/config")
def api_set_config(cfg: Dict[str, Any]):
    store.save_config(cfg)
    return {"ok": True}

@app.post("/api/admin/retriage")
def api_retriage():
    return store.retriage_missing()

@app.post("/api/kb/from_ticket")
def api_kb_from_ticket(ticket_id: int):
    return store.generate_kb_from_ticket(ticket_id)

@app.post("/api/fixes/suggest")
def api_fix_suggest(payload: FixSuggestPayload):
    return fixes.detect_fixes(payload.subject, payload.body)

@app.post("/api/fixes/execute")
def api_fix_execute(payload: FixExecutePayload):
    return fixes.execute_fix(payload.fix_id, payload.subject or "", payload.body or "", payload.username)

@app.post("/api/assist/reply")
def api_assist_reply(payload: AssistPayload):
    return assist.draft_reply(payload.subject, payload.body)

@app.post("/api/auth/login")
def api_login(payload: LoginPayload):
    u = store.get_user(payload.username)
    if not u:
        return {"ok": False, "reason": "user_not_found"}
    if u.get("locked", False):
        return {"ok": False, "reason": "locked"}
    if not store.check_password(u, payload.password):
        return {"ok": False, "reason": "bad_password"}
    return {"ok": True, "role": u.get("role", "user")}
    
@app.post("/api/auth/unlock")
def api_unlock(payload: UnlockPayload):
    store.unlock_user(payload.username)
    store.add_notification(payload.username, "Your account has been unlocked. Please sign in.", "success")
    return {"ok": True}

@app.get("/api/notifications")
def api_notifications(user: str):
    return {"items": store.get_notifications(user)}

@app.post("/api/notify")
def api_notify(payload: NotifyPayload):
    evt = store.add_notification(payload.username, payload.message, payload.type or "info")
    return {"ok": True, "event": evt}

@app.post("/api/demo/reset")
def api_demo_reset(username: str = "tech2345",
                   clear_notifications: bool = True,
                   clear_deflections: bool = False):
    store.lock_user(username)
    if clear_notifications:
        store.clear_notifications()
    if clear_deflections:
        store.clear_deflections()
    return {"ok": True}