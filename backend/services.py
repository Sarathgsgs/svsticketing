import re
from typing import Dict, Any, List

def classify(text: str) -> Dict[str, Any]:
    t = (text or "").lower()
    service, group, priority = "Desktop", "EUC", "P3"
    rationale: List[str] = []
    entities: Dict[str, str] = {}

    m_err = re.search(r"(?:error\s*\d{3,5}|\b\d{3}\b|sp01|spad)", t)
    if m_err: entities["code"] = m_err.group(0)
    m_loc = re.search(r"\b(north|south|east|west|plant|office|hq)\b", t)
    if m_loc: entities["location"] = m_loc.group(0)

    if re.search(r"\bsap|sp01|spad|spool|dump|t-?code", t):
        service, group, priority = "SAP Basis", "SAP Ops North", "P2"; rationale.append("keyword: SAP/Spool")
    elif re.search(r"\bvpn|619|anyconnect", t):
        service, group, priority = "VPN", "Network Ops", "P2"; rationale.append("keyword: VPN/619")
    elif re.search(r"\bpassword|unlock|mfa|otp", t):
        service, group, priority = "Identity", "IAM", "P3"; rationale.append("keyword: Identity/Password")
    elif re.search(r"\bprinter|print\s*queue|spooler", t):
        service, group, priority = "Desktop/Printer", "EUC", "P3"; rationale.append("keyword: Printer/Queue")
    elif re.search(r"\boutlook|ost|search", t):
        service, group, priority = "Email/Outlook", "EUC", "P3"; rationale.append("keyword: Outlook/OST")

    confidence = 0.8 if rationale else 0.55
    return {
        "type":"incident","service":service,"assignment_group":group,
        "priority":priority,"confidence":confidence,"rationale":rationale,"entities":entities
    }