from typing import Dict, Any
import store

def draft_reply(subject:str, body:str)->Dict[str,Any]:
    text=f"{subject}\n{body}".strip()
    kb=store.kb_search(text, k=1)
    if kb:
        top=kb[0]
        reply = (
            f"Hi,\n\nBased on your description, this may relate to: {top['title']}.\n"
            f"Recommended steps:\n{top['chunk']}\n\nPlease try these steps and let us know.\n\nThanks,"
        )
        return {"ok":True,"source":top["title"],"reply":reply}
    return {"ok":True,"source":None,"reply":"Hi,\n\nWe are reviewing your issue. Please share any error codes or screenshots.\n\nThanks,"}