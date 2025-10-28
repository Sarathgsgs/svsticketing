import joblib
import pandas as pd
from sklearn.neighbors import NearestNeighbors

ARTIFACT_DIR = "artifacts"

def load_pipelines():
    cat_pipe = joblib.load(f"{ARTIFACT_DIR}/category_pipeline.joblib")
    pri_pipe = joblib.load(f"{ARTIFACT_DIR}/priority_pipeline.joblib")
    vect = joblib.load(f"{ARTIFACT_DIR}/tfidf_for_similarity.joblib")
    nn = joblib.load(f"{ARTIFACT_DIR}/nn_index.joblib")
    tickets = pd.read_csv(f"{ARTIFACT_DIR}/tickets_for_lookup.csv")
    return cat_pipe, pri_pipe, vect, nn, tickets

def suggest_similar_solutions(text, top_k=3):
    cat_pipe, pri_pipe, vect, nn, tickets = load_pipelines()
    x = vect.transform([text])
    dists, idxs = nn.kneighbors(x, n_neighbors=top_k)
    suggestions = []
    for dist, idx in zip(dists[0], idxs[0]):
        row = tickets.iloc[idx]
        suggestions.append({
            'ticket_id': int(row['ticket_id']),  # <-- cast to int!
            'category': row['category'],
            'priority': row['priority'],
            'text': row['text'],
            'solution': row.get('solution', '')
        })
    return suggestions

def classify_ticket(text):
    cat_pipe, pri_pipe, *_ = load_pipelines()
    category = cat_pipe.predict([text])[0]
    priority = pri_pipe.predict([text])[0]
    cat_prob = max(cat_pipe.predict_proba([text])[0]) if hasattr(cat_pipe, "predict_proba") else None
    pri_prob = max(pri_pipe.predict_proba([text])[0]) if hasattr(pri_pipe, "predict_proba") else None
    return {'category': category, 'category_conf': float(cat_prob) if cat_prob is not None else None,
            'priority': priority, 'priority_conf': float(pri_prob) if pri_prob is not None else None}