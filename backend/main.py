from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

import services, store, fixes, assist

# optional actions import (fallback runner included)
try:
    import actions
    def run_action(action_id: str, params: Dict[str, Any]):
        return actions.run_action(action_id, params or {})
except Exception:
    def run_action(action_id: str, params: Dict[str, Any]):
        return [f"[SIMULATION] Run {action_id} with {params}"]

app = FastAPI(title="TicketPilot API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --------- Models ----------
class Attachment(BaseModel):
    filename: str
    data_url: str

class CreateTicket(BaseModel):
    subject: str
    body: str
    attachments: Optional[List[Attachment]] = None
    type: Optional[str] = "Incident"
    location: Optional[str] = ""
    asset: Optional[str] = ""
    urgency: Optional[str] = "Medium"
    assigned_to: Optional[str] = ""

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

class MagicCreatePayload(BaseModel):
    username: str
    kind: str
    payload: Dict[str, Any]

class ActionRequest(BaseModel):
    action_id: str
    params: Dict[str, Any] = {}
    requested_by: str
    require_elevation: bool = False
    elevation_token: Optional[str] = None

class ActionDecision(BaseModel):
    id: int
    approved: bool
    reviewer: str

class ElevationRequest(BaseModel):
    user: str
    scope: str
    minutes: int = 15

class MiCreatePayload(BaseModel):
    seed_ticket_id: int
    threshold: float = 0.85

# --------- Endpoints ----------
@app.post("/api/triage")
def api_triage(payload: CreateTicket):
    textq = f"{payload.subject}\n{payload.body}".strip()
    tri = services.classify(textq)
    hits = store.kb_search(textq, k=3)
    dupes = store.dedup(textq, k=3)
    top_kb = hits[0]["title"] if hits else None
    ctx = store.get_service_meta(tri.get("service",""))
    chg = store.get_recent_change(tri.get("service",""))
    return {"triage": tri, "kb": hits, "duplicates": dupes, "top_kb": top_kb, "context": {"blast_radius": ctx, "recent_change": chg}}

@app.post("/api/tickets")
def api_create_ticket(payload: CreateTicket):
    textq = f"{payload.subject}\n{payload.body}".strip()
    tri = services.classify(textq)
    extra = {
        "type": payload.type,
        "location": payload.location,
        "asset": payload.asset,
        "urgency": payload.urgency,
        "assigned_to": payload.assigned_to,
    }
    t = store.add_ticket(payload.subject, payload.body, tri, attachments=[a.dict() for a in (payload.attachments or [])], extra=extra)
    dupes = store.dedup(textq, k=3)
    store.bump_counter(tri.get("service",""))
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

# Magic links
@app.post("/api/magic/create")
def api_magic_create(payload: MagicCreatePayload):
    token = store.create_magic(payload.username, payload.kind, payload.payload)
    url = f"http://localhost:5173/confirm?token={token}"
    return {"ok": True, "token": token, "url": url}

@app.get("/api/magic/confirm")
def api_magic_confirm(token: str, ok: bool = True):
    item = store.consume_magic(token)
    if not item:
        seen = store.get_magic(token)
        if seen and seen.get("used"):
            return {"ok": True, "already": True}
        return {"ok": False, "error": "invalid_or_used_token"}
    if not ok:
        payload = item.get("payload") or {}
        subject = payload.get("subject", "Issue")
        body = payload.get("body", "No details")
        tri = services.classify(f"{subject}\n{body}")
        t = store.add_ticket(subject, body, tri, attachments=payload.get("attachments") or [])
        return {"ok": True, "created_ticket_id": t["id"], "payload": payload}
    return {"ok": True, "confirmed": True}

# Demo reset
@app.post("/api/demo/reset")
def api_demo_reset(username: str = "tech2345", clear_notifications: bool = True, clear_deflections: bool = False):
    store.lock_user(username)
    if clear_notifications:
        store.clear_notifications()
    if clear_deflections:
        store.clear_deflections()
    return {"ok": True}

# Actions / approvals / elevation
@app.post("/api/actions/request")
def api_actions_request(payload: ActionRequest):
    ap = store.add_approval(payload.action_id, payload.params, payload.requested_by, payload.require_elevation, payload.elevation_token)
    return {"ok": True, "approval": ap}

@app.post("/api/actions/decision")
def api_actions_decision(payload: ActionDecision):
    ap = store.update_approval(payload.id, payload.approved, payload.reviewer)
    if not ap:
        return {"ok": False, "error": "not_found"}
    if ap["status"] == "approved":
        ap = store.exec_approval(ap["id"], run_action)
    return {"ok": True, "approval": ap}

@app.get("/api/approvals")
def api_approvals():
    return {"items": store.list_approvals()}

@app.post("/api/elevation/request")
def api_elevation_request(payload: ElevationRequest):
    tok = store.request_elevation(payload.user, payload.scope, payload.minutes)
    return {"ok": True, "token": tok}

@app.post("/api/elevation/verify")
def api_elevation_verify(token: str):
    return {"ok": store.is_elevated(token)}

# Major Incident and spikes
@app.post("/api/mi/create")
def api_mi_create(payload: MiCreatePayload):
    mi = store.create_mi(payload.seed_ticket_id, th=payload.threshold)
    return {"ok": True, "mi": mi}

@app.get("/api/mi")
def api_mi_list():
    return {"items": store.list_mi()}

@app.get("/api/spikes")
def api_spikes():
    return {"items": store.get_spikes()}

@app.get("/api/metrics/breakdown")
def api_metrics_breakdown():
    return store.metrics_breakdown()

@app.get("/api/metrics/series")
def api_metrics_series(hours: int = 24):
    return store.metrics_series(hours)

@app.get("/api/mi/for_ticket/{ticket_id}")
def api_mi_for_ticket(ticket_id: int):
    mi = store.get_mi_for_ticket(ticket_id)
    return {"mi": mi}
class WorklogPayload(BaseModel):
    ticket_id: int
    author: str
    note: str

@app.post("/api/tickets/worklog")
def api_worklog(payload: WorklogPayload):
    for t in store.TICKETS:
        if t["id"] == payload.ticket_id:
            t.setdefault("worklogs", []).append({
                "author": payload.author,
                "note": payload.note,
                "ts": datetime.now(timezone.utc).isoformat()
            })
            store._save_json(store.TICKETS_JSON, store.TICKETS)
            return {"ok": True}
    return {"ok": False, "error": "not_found"}