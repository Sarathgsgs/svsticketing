# backend/similarity.py
from sentence_transformers import SentenceTransformer, util
import torch

# Load once – small & fast
_model = SentenceTransformer("all-MiniLM-L6-v2")

def find_similar(issue: str, kb_texts: list[str], threshold: float = 0.80):
    """Return the best‑matching KB entry by cosine similarity."""
    emb = _model.encode([issue, *kb_texts], convert_to_tensor=True)
    sims = util.cos_sim(emb[0], emb[1:])
    best_idx = torch.argmax(sims).item()
    score = float(sims[0][best_idx])
    if score >= threshold:
        return {"match": kb_texts[best_idx], "score": round(score, 3)}
    return {"match": None, "score": round(score, 3)}