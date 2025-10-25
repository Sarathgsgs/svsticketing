from pathlib import Path
import json, csv, hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize
import services
import uuid  # for magic tokens

# Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "data"
KB_DIR = DATA_DIR / "kb"
TICKETS_JSON = DATA_DIR / "tickets.json"
DEFLECTIONS_JSON = DATA_DIR / "deflections.json"
CONFIG_JSON = DATA_DIR / "config.json"
SEED_CSV = DATA_DIR / "tickets_seed.csv"
USERS_JSON = DATA_DIR / "users.json"
NOTIFICATIONS_JSON = DATA_DIR / "notifications.json"
MAGIC_JSON = DATA_DIR / "magic.json"  # <-- AFTER DATA_DIR

# In-memory stores
KB_DOCS: List[Dict[str, Any]] = []
KB_CHUNKS: List[Dict[str, Any]] = []
TICKETS: List[Dict[str, Any]] = []
DEFLECTIONS: List[Dict[str, Any]] = []
USERS: List[Dict[str, Any]] = []
NOTIFICATIONS: List[Dict[str, Any]] = []
MAGIC: List[Dict[str, Any]] = []     # <-- magic tokens in memory

# Vectorizers and matrices
KB_VECT: Optional[TfidfVectorizer] = None
KB_MATRIX = None
TICKET_VECT: Optional[TfidfVectorizer] = None
TICKET_MATRIX = None

DEFAULT_CONFIG = {"auto_resolve_threshold": {"triage": 0.6, "kb": 0.6}, "dedup_similarity": 0.8}

def _save_json(path: Path, data: Any):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def _load_json(path: Path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default

def hash_pw(p: str) -> str:
    return hashlib.sha256(("demo_salt:" + (p or "")).encode("utf-8")).hexdigest()

def check_password(user: dict, plain: str) -> bool:
    return user.get("password") == hash_pw(plain or "")

# ------------- Users / Auth -------------
def load_users():
    global USERS
    data = _load_json(USERS_JSON, None)
    if not data:
        USERS = [
            {"username": "tech2345", "role": "user",  "locked": True,  "password": hash_pw("user123")},
            {"username": "agent1",   "role": "agent", "locked": False, "password": hash_pw("agent123")},
            {"username": "admin1",   "role": "admin", "locked": False, "password": hash_pw("admin123")},
        ]
        _save_json(USERS_JSON, USERS)
        return
    USERS = data
    changed = False
    for u in USERS:
        if "role" not in u: u["role"] = "user"; changed = True
        if "password" not in u: u["password"] = hash_pw("user123"); changed = True
        if "locked" not in u: u["locked"] = False; changed = True
    if changed:
        _save_json(USERS_JSON, USERS)

def save_users():
    _save_json(USERS_JSON, USERS)

def get_user(username: str) -> dict | None:
    return next((u for u in USERS if u.get("username") == username), None)

def unlock_user(username: str) -> bool:
    u = get_user(username)
    if not u:
        USERS.append({"username": username, "role": "user", "locked": False, "password": hash_pw("user123")})
        save_users()
        return True
    u["locked"] = False
    save_users()
    return True

def lock_user(username: str) -> bool:
    u = get_user(username)
    if not u:
        USERS.append({"username": username, "role": "user", "locked": True, "password": hash_pw("user123")})
        save_users()
        return True
    u["locked"] = True
    save_users()
    return True

# ------------- Notifications -------------
def load_notifications():
    global NOTIFICATIONS
    NOTIFICATIONS = _load_json(NOTIFICATIONS_JSON, [])
    _save_json(NOTIFICATIONS_JSON, NOTIFICATIONS)

def save_notifications():
    _save_json(NOTIFICATIONS_JSON, NOTIFICATIONS)

def add_notification(username: str, message: str, ntype: str = "info", link: str | None = None) -> Dict[str, Any]:
    nid = (max([n.get("id", 0) for n in NOTIFICATIONS]) + 1) if NOTIFICATIONS else 1
    evt = {"id": nid, "username": username, "message": message, "type": ntype, "ts": datetime.now(timezone.utc).isoformat()}
    if link:
        evt["link"] = link
    NOTIFICATIONS.append(evt)
    _save_json(NOTIFICATIONS_JSON, NOTIFICATIONS)
    return evt

def get_notifications(username: str) -> List[Dict[str, Any]]:
    return sorted([n for n in NOTIFICATIONS if n.get("username") == username], key=lambda x: x["id"], reverse=True)

def clear_notifications():
    global NOTIFICATIONS
    NOTIFICATIONS = []
    _save_json(NOTIFICATIONS_JSON, NOTIFICATIONS)

def load_magic():
    global MAGIC
    MAGIC = _load_json(MAGIC_JSON, [])
    _save_json(MAGIC_JSON, MAGIC)

def save_magic():
    _save_json(MAGIC_JSON, MAGIC)

def create_magic(username: str, kind: str, payload: Dict[str, Any]) -> str:
    token = uuid.uuid4().hex
    MAGIC.append({
        "token": token,
        "username": username,
        "kind": kind,            # e.g., "deflection_confirm"
        "payload": payload,      # arbitrary dict (subject/body/etc)
        "ts": datetime.now(timezone.utc).isoformat(),
        "used": False
    })
    save_magic()
    return token

def consume_magic(token: str) -> Dict[str, Any] | None:
    for item in MAGIC:
        if item.get("token") == token and not item.get("used"):
            item["used"] = True
            save_magic()
            return item
    return None

# ------------- KB -------------
def chunk_text(text: str, tokens: int = 120):
    words = text.split()
    for i in range(0, len(words), tokens):
        yield " ".join(words[i:i+tokens])

def build_kb_index():
    global KB_VECT, KB_MATRIX
    texts = [c["chunk"] for c in KB_CHUNKS]
    if not texts:
        KB_VECT = KB_MATRIX = None
        return
    KB_VECT = TfidfVectorizer(ngram_range=(1, 2), max_features=20000)
    KB_MATRIX = normalize(KB_VECT.fit_transform(texts))

def load_kb():
    KB_DOCS.clear()
    KB_CHUNKS.clear()
    doc_id = 1
    for p in sorted(KB_DIR.glob("*.md")):
        body = p.read_text(encoding="utf-8")
        title = p.stem.replace("_", " ").title()
        KB_DOCS.append({"id": doc_id, "title": title, "source": str(p)})
        for ch in chunk_text(body, 120):
            KB_CHUNKS.append({"doc_id": doc_id, "title": title, "chunk": ch})
        doc_id += 1
    build_kb_index()

def kb_search(query: str, k: int = 3):
    if KB_VECT is None or KB_MATRIX is None:
        return []
    q = normalize(KB_VECT.transform([query]))
    sims = (KB_MATRIX @ q.T).toarray().ravel()
    idxs = np.argsort(sims)[::-1][:k]
    res = []
    for i in idxs:
        c = KB_CHUNKS[int(i)]
        res.append({"doc_id": c["doc_id"], "title": c["title"], "chunk": c["chunk"], "score": float(sims[int(i)])})
    return res

# ------------- Tickets -------------
def load_tickets():
    TICKETS.clear()
    if TICKETS_JSON.exists():
        TICKETS.extend(_load_json(TICKETS_JSON, []))
    elif SEED_CSV.exists():
        rows = list(csv.DictReader(open(SEED_CSV, newline="", encoding="utf-8")))
        i = 1
        for r in rows:
            TICKETS.append({
                "id": i, "subject": r.get("subject", ""), "body": r.get("body", ""),
                "service": "", "assignment_group": "", "priority": "P3",
                "status": "open", "triage_confidence": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "attachments": []
            })
            i += 1
        _save_json(TICKETS_JSON, TICKETS)
    build_ticket_index()

def build_ticket_index():
    global TICKET_VECT, TICKET_MATRIX
    texts = [f"{t['subject']}\n{t['body']}" for t in TICKETS]
    if not texts:
        TICKET_VECT = TICKET_MATRIX = None
        return
    TICKET_VECT = TfidfVectorizer(ngram_range=(1, 2), max_features=20000)
    TICKET_MATRIX = normalize(TICKET_VECT.fit_transform(texts))

def add_ticket(subject: str, body: str, tri: Dict[str, Any], attachments: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    nid = (max([t["id"] for t in TICKETS]) + 1) if TICKETS else 1
    t = {
        "id": nid, "subject": subject, "body": body,
        "service": tri["service"], "assignment_group": tri["assignment_group"],
        "priority": tri["priority"], "status": "open",
        "triage_confidence": tri["confidence"], "created_at": datetime.now(timezone.utc).isoformat(),
        "attachments": attachments or []
    }
    TICKETS.append(t)
    _save_json(TICKETS_JSON, TICKETS)
    build_ticket_index()
    return t

def update_ticket_status(ticket_id: int, status: str):
    for t in TICKETS:
        if t["id"] == ticket_id:
            t["status"] = status
            _save_json(TICKETS_JSON, TICKETS)
            return t
    return None

def merge_tickets(source_id: int, dup_ids: List[int]):
    changed = 0
    for t in TICKETS:
        if t["id"] in dup_ids and t["id"] != source_id:
            t["status"] = "merged"
            t["merged_into"] = source_id
            changed += 1
    if changed:
        _save_json(TICKETS_JSON, TICKETS)
        build_ticket_index()
    return {"merged": changed}

def dedup(query: str, k: int = 3):
    if TICKET_VECT is None or TICKET_MATRIX is None:
        return []
    q = normalize(TICKET_VECT.transform([query]))
    sims = (TICKET_MATRIX @ q.T).toarray().ravel()
    idxs = np.argsort(sims)[::-1][:k]
    return [{"ticket_id": TICKETS[i]["id"], "similarity": float(sims[i])} for i in idxs]

def similar_to_ticket(ticket_id: int, k: int = 3):
    target = next((t for t in TICKETS if t["id"] == ticket_id), None)
    if not target:
        return []
    text = f"{target.get('subject', '')}\n{target.get('body', '')}"
    res = dedup(text, k + 1)
    return [r for r in res if r["ticket_id"] != ticket_id][:k]

def add_deflection(subject: str, body: str, article_doc_id: Optional[int]):
    DEFLECTIONS.append({"subject": subject, "body": body, "article_doc_id": article_doc_id, "ts": datetime.now(timezone.utc).isoformat()})
    _save_json(DEFLECTIONS_JSON, DEFLECTIONS)

def clear_deflections():
    global DEFLECTIONS
    DEFLECTIONS = []
    _save_json(DEFLECTIONS_JSON, DEFLECTIONS)

def metrics():
    return {
        "tickets": len(TICKETS),
        "deflections": len(DEFLECTIONS),
        "merged": len([t for t in TICKETS if t.get("status") == "merged"]),
        "resolved": len([t for t in TICKETS if t.get("status") == "resolved"]),
    }

def compute_sla_risk(t: Dict[str, Any]) -> float:
    pr = (t.get("priority") or "P3").upper()
    base = 0.9 if pr == "P1" else (0.7 if pr == "P2" else 0.4)
    try:
        age_h = (datetime.now(timezone.utc) - datetime.fromisoformat(t.get("created_at"))).total_seconds() / 3600.0
    except Exception:
        age_h = 0.0
    penalty = 0.2 if age_h >= 8 else (0.1 if age_h >= 4 else 0.0)
    return float(min(1.0, base + penalty))

def list_tickets(q: Optional[str] = None, service: Optional[str] = None, status: Optional[str] = None, sort: Optional[str] = None):
    rows = [dict(t) for t in TICKETS]
    for t in rows:
        t["risk"] = compute_sla_risk(t)
    if q:
        ql = q.lower()
        rows = [t for t in rows if ql in (t.get("subject", "").lower() + " " + t.get("body", "").lower())]
    if service:
        rows = [t for t in rows if (t.get("service") or "").lower() == service.lower()]
    if status and status.lower() != "all":
        rows = [t for t in rows if (t.get("status") or "").lower() == status.lower()]
    if sort == "risk":
        rows.sort(key=lambda x: x.get("risk", 0.0), reverse=True)
    else:
        rows.sort(key=lambda x: x["id"], reverse=True)
    return rows

def retriage_missing():
    changed = 0
    for t in TICKETS:
        if (not t.get("service")) or (not t.get("assignment_group")) or (t.get("triage_confidence") is None):
            tri = services.classify(f"{t.get('subject', '')}\n{t.get('body', '')}")
            t["service"] = tri["service"]
            t["assignment_group"] = tri["assignment_group"]
            t["priority"] = tri["priority"]
            t["triage_confidence"] = tri["confidence"]
            changed += 1
    if changed:
        _save_json(TICKETS_JSON, TICKETS)
        build_ticket_index()
    return {"updated": changed, "total": len(TICKETS)}

def generate_kb_from_ticket(ticket_id: int) -> Dict[str, Any]:
    t = next((x for x in TICKETS if x["id"] == ticket_id), None)
    if not t:
        return {"ok": False, "error": "not_found"}
    slug = f"kb_ticket_{ticket_id}.md"
    p = KB_DIR / slug
    body = f"# {t.get('subject', 'Ticket ' + str(ticket_id))}\n\nSymptoms:\n- {t.get('body', '(not provided)')}\n\nFix steps:\n1. Apply known steps.\n2. Verify and close.\n"
    p.write_text(body, encoding="utf-8")
    load_kb()
    return {"ok": True, "kb_file": str(p)}

def load_config() -> Dict[str, Any]:
    cfg = _load_json(CONFIG_JSON, DEFAULT_CONFIG)
    for k, v in DEFAULT_CONFIG.items():
        if k not in cfg:
            cfg[k] = v
    _save_json(CONFIG_JSON, cfg)
    return cfg

def save_config(cfg: Dict[str, Any]):
    _save_json(CONFIG_JSON, cfg)

# ------------- Init -------------
def init():
    KB_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    save_config(load_config())
    load_kb()
    load_tickets()
    load_users()
    load_notifications()
    load_magic()  # <-- add this
    try:
        retriage_missing()
    except Exception:
        pass

init()
