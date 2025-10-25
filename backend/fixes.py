import re
from typing import List, Dict, Any, Optional
import store

FIXES: Dict[str, Dict[str, Any]] = {
    "vpn_619_reset": {
        "title":"VPN 619 Reset","description":"Reset network stack for 619 error.",
        "steps":["Close VPN client","netsh int ip reset","netsh winsock reset","ipconfig /flushdns","Restart RasMan","Reopen VPN client"],
        "script_preview":["netsh int ip reset","netsh winsock reset","ipconfig /flushdns","powershell -Command Restart-Service RasMan -Force"],
        "simulated":True,"can_execute":False
    },
    "printer_spool_clear": {
        "title":"Clear Print Spooler Queue","description":"Stop spooler, clear PRINTERS, start spooler.",
        "steps":["net stop spooler","Delete PRINTERS folder files","net start spooler"],
        "script_preview":["net stop spooler","del %SystemRoot%\\System32\\spool\\PRINTERS\\* /Q","net start spooler"],
        "simulated":True,"can_execute":False
    },
    "dns_flush": {
        "title":"Flush DNS Cache","description":"Fix name resolution.",
        "steps":["ipconfig /flushdns","Retry"],"script_preview":["ipconfig /flushdns"],
        "simulated":True,"can_execute":False
    },
    "outlook_ost_repair": {
        "title":"Outlook OST Repair","description":"scanpst.exe, recreate profile, rebuild index.",
        "steps":["Run scanpst.exe","Recreate profile","Rebuild index"],
        "script_preview":["start \"\" \"%ProgramFiles%\\Microsoft Office\\root\\Office16\\SCANPST.EXE\""],
        "simulated":True,"can_execute":False
    },
    "sap_spool_check": {
        "title":"SAP Spool Check","description":"SPAD status, SM50 restart, clear SPO*.",
        "steps":["Check SPAD","Restart SM50 Spool WP","Clear SPO* (admin)"],
        "script_preview":[], "simulated":True,"can_execute":False
    },
    "password_unlock_flow": {
        "title":"Password Unlock / MFA Reset","description":"Self-service unlock or MFA reset.",
        "steps":["Use self-service unlock","Verify MFA enrollment","Retry login"],
        "script_preview":[], "simulated":True,"can_execute":False
    },
}

RULES: List[Dict[str, Any]] = [
    {"id":"vpn_619_reset","patterns":[r"vpn",r"619",r"anyconnect"]},
    {"id":"printer_spool_clear","patterns":[r"printer",r"queue",r"spool"]},
    {"id":"dns_flush","patterns":[r"dns",r"resolve",r"website"]},
    {"id":"outlook_ost_repair","patterns":[r"outlook",r"ost",r"search"]},
    {"id":"sap_spool_check","patterns":[r"sap",r"sp01",r"spad",r"spool"]},
    {"id":"password_unlock_flow","patterns":[r"password",r"unlock",r"mfa",r"otp"]},
]

def detect_fixes(subject:str, body:str, k:int=3)->Dict[str,Any]:
    text=f"{subject}\n{body}".lower(); hits=[]; seen=set()
    for rule in RULES:
        if any(re.search(p, text) for p in rule["patterns"]):
            fid=rule["id"]
            if fid in seen: continue
            seen.add(fid); fx=FIXES.get(fid)
            if fx: hits.append({"id":fid,"title":fx["title"],"description":fx["description"],"steps":fx["steps"],"simulated":True,"can_execute":False})
        if len(hits)>=k: break
    return {"fixes":hits}

def execute_fix(fix_id:str, subject:str, body:str, username:Optional[str]=None)->Dict[str,Any]:
    fx=FIXES.get(fix_id)
    if not fx: return {"ok":False,"error":"unknown_fix"}
    output=["[SIMULATION] Would run the following commands:"]+(fx.get("script_preview") or ["(no commands)"])

    if fix_id=="password_unlock_flow" and username:
        try:
            store.unlock_user(username)
            store.add_notification(username, "Your account was unlocked. Please sign in.", "success")
        except Exception:
            pass

    try: store.add_deflection(subject, body, None)
    except Exception: pass

    return {"ok":True,"simulated":True,"fix_id":fix_id,"output":output,"deflected":True}