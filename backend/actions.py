# backend/actions.py
from typing import Dict, Any, List

# Simulated action registry. Each action returns a list of "commands/output"
def clear_spooler(params: Dict[str, Any]) -> List[str]:
    target = params.get("printer", "PRN-01")
    return [
        f"[{target}] net stop spooler",
        f"[{target}] del %SystemRoot%\\System32\\spool\\PRINTERS\\* /Q",
        f"[{target}] net start spooler",
        "[SIMULATION] Spooler cleared."
    ]

def restart_service(params: Dict[str, Any]) -> List[str]:
    svc = params.get("service", "SomeService")
    return [f"sc stop {svc}", f"sc start {svc}", f"[SIMULATION] {svc} restarted."]

def unlock_user(params: Dict[str, Any]) -> List[str]:
    user = params.get("user", "tech2345")
    return [f"[SIMULATION] Unlocked user {user} in directory."]

REGISTRY = {
    "clear_spooler": {"title":"Clear Spooler","runner": clear_spooler},
    "restart_service": {"title":"Restart Service","runner": restart_service},
    "unlock_user": {"title":"Unlock User","runner": unlock_user},
}

def run_action(action_id: str, params: Dict[str, Any]) -> List[str]:
    act = REGISTRY.get(action_id)
    if not act:
        return ["[ERROR] Unknown action"]
    return act["runner"](params or {})