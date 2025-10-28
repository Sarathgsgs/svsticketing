"""
Train a ticket classifier and a similarity index for suggestion lookup.
Expects a CSV (sample_tickets.csv) with columns: ticket_id, text, category, priority, solution
"""
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.neighbors import NearestNeighbors
import os

DATA_PATH = "sample_tickets.csv"
ARTIFACT_DIR = "artifacts"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def load_data(path=DATA_PATH):
    df = pd.read_csv(path)
    df['text'] = df['text'].fillna('').astype(str)
    df['category'] = df['category'].astype(str)
    df['priority'] = df['priority'].astype(str)
    return df

def train_classifier(df):
    vect = TfidfVectorizer(ngram_range=(1,2), max_features=10000)
    model = LogisticRegression(max_iter=1000)
    pipeline = Pipeline([('tfidf', vect), ('clf', model)])
    pipeline.fit(df['text'], df['category'])
    joblib.dump(pipeline, f"{ARTIFACT_DIR}/category_pipeline.joblib")
    print("Saved category pipeline.")
    return pipeline

def train_priority_classifier(df):
    vect = TfidfVectorizer(ngram_range=(1,2), max_features=5000)
    model = LogisticRegression(max_iter=1000)
    pipeline = Pipeline([('tfidf', vect), ('clf', model)])
    pipeline.fit(df['text'], df['priority'])
    joblib.dump(pipeline, f"{ARTIFACT_DIR}/priority_pipeline.joblib")
    print("Saved priority pipeline.")
    return pipeline

def build_similarity_index(df):
    vect = TfidfVectorizer(ngram_range=(1,2), max_features=5000)
    X = vect.fit_transform(df['text'])
    nn = NearestNeighbors(n_neighbors=5, metric='cosine').fit(X)
    joblib.dump(vect, f"{ARTIFACT_DIR}/tfidf_for_similarity.joblib")
    joblib.dump(nn, f"{ARTIFACT_DIR}/nn_index.joblib")
    df.to_csv(f"{ARTIFACT_DIR}/tickets_for_lookup.csv", index=False)
    print("Saved similarity index and ticket lookup.")
    return vect, nn

def main():
    df = load_data()
    train_classifier(df)
    train_priority_classifier(df)
    build_similarity_index(df)

if __name__ == '__main__':
    main()