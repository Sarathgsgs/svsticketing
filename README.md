# POWERGRID Ops (Smart Helpdesk MVP)

Run locally (two terminals):
- Backend: scripts\start_backend.bat
- Frontend: scripts\start_frontend.bat
Open http://localhost:5173 (UI) and http://localhost:8000/api/metrics (API)

Pages
- Ask (end-user): subject, details, screenshot upload + OCR, Suggest Fix, Create Ticket, Auto-resolve.
- Resolve (agent): search/filter/sort by risk, find/merge duplicates, draft reply, mark resolved, create KB.
- Govern (admin): metrics (tickets/deflections/merged/resolved), thresholds, re-triage.
- Login (demo): simulates locked user; report issue pre-fills Ask; auto-fix unlocks account; login succeeds (Dashboard shows solved).

API (FastAPI)
- POST /api/triage, POST /api/tickets, GET /api/tickets, POST /api/tickets/merge,
  POST /api/tickets/status, GET /api/tickets/similar/{id}, POST /api/deflect,
  GET /api/metrics, GET/POST /api/admin/config, POST /api/admin/retriage,
  POST /api/kb/from_ticket, POST /api/fixes/suggest, POST /api/fixes/execute,
  POST /api/assist/reply, POST /api/auth/login, POST /api/auth/unlock,
  GET /api/notifications, POST /api/notify

Role gating (UI)
- Nav shows Resolve only for role agent/admin; Govern only for admin.
- Set role on Login page (demo only). In production, integrate real auth.

Demo script
1) Login as tech2345 (locked) -> fails.
2) Click Report issue -> Ask prefilled (add screenshot if you want).
3) Suggest Fix -> "Password Unlock / MFA Reset" -> Run Auto Fix.
4) Back to Login -> login succeeds -> Dashboard shows "Problem solved" and notification.
