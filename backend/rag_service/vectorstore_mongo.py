import os
import numpy as np
from pymongo import MongoClient, ASCENDING
from typing import List, Dict, Any, Optional

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "icare")
COL_DOCS = "rds_documents"
COL_CHUNKS = "rds_chunks"

# Use pymongo (sync) for this helper
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
chunks_col = db[COL_CHUNKS]
docs_col = db[COL_DOCS]

def ensure_indexes():
    """Create indexes for faster retrieval"""
    chunks_col.create_index([("doc_id", ASCENDING)])
    docs_col.create_index([("added_at", ASCENDING)])

def upsert_document(doc_id: str, title: str, metadata: Dict[str, Any]):
    docs_col.update_one({"_id": doc_id}, {"$set": {"title": title, "meta": metadata, "added_at": __now()}}, upsert=True)

def upsert_chunks(doc_id: str, chunk_texts: List[str], chunk_embeddings: List[List[float]], meta: Optional[Dict[str, Any]] = None):
    """Bulk insert chunks for better performance"""
    # delete existing chunks for doc
    chunks_col.delete_many({"doc_id": doc_id})
    
    if not chunk_texts:
        return
    
    # Prepare all documents at once
    to_insert = []
    for i, (txt, emb) in enumerate(zip(chunk_texts, chunk_embeddings)):
        to_insert.append({
            "doc_id": doc_id,
            "chunk_id": f"{doc_id}__{i}",
            "text": txt,
            "embedding": emb,
            "meta": meta or {},
        })
    
    # Bulk insert (much faster than one-by-one)
    if to_insert:
        chunks_col.insert_many(to_insert, ordered=False)

def _cosine_sim(a: np.ndarray, b: np.ndarray):
    """Fast cosine similarity with numerical stability"""
    a_norm = np.linalg.norm(a)
    b_norm = np.linalg.norm(b)
    if a_norm == 0 or b_norm == 0:
        return 0.0
    return float(np.dot(a, b) / (a_norm * b_norm))

def search_similar_local(query_embedding: List[float], top_k: int = 5, filter_doc_ids: Optional[List[str]] = None):
    """
    OPTIMIZED: Search with query projection to reduce data transfer.
    Only fetch necessary fields and limit candidate pool.
    """
    q_emb = np.asarray(query_embedding, dtype=np.float32)
    
    # Build query
    query = {}
    if filter_doc_ids:
        query["doc_id"] = {"$in": filter_doc_ids}
    
    # OPTIMIZATION 1: Only fetch required fields (reduce network I/O)
    projection = {
        "doc_id": 1,
        "chunk_id": 1,
        "text": 1,
        "embedding": 1,
        "meta": 1
    }
    
    # OPTIMIZATION 2: Limit candidates early (adjust based on your data size)
    # For datasets with 1000s of chunks, limit to top 100-200 candidates
    max_candidates = 200
    
    cursor = chunks_col.find(query, projection).limit(max_candidates)
    
    results = []
    for doc in cursor:
        emb = doc.get("embedding")
        if not emb:
            continue
        
        # Convert to numpy array
        emb_arr = np.asarray(emb, dtype=np.float32)
        if emb_arr.size == 0:
            continue
        
        # Calculate similarity
        score = _cosine_sim(q_emb, emb_arr)
        
        results.append({
            "doc_id": doc["doc_id"],
            "chunk_id": doc["chunk_id"],
            "text": doc["text"],
            "score": score,
            "meta": doc.get("meta", {})
        })
    
    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    
    # Return top_k
    return results[:top_k]

def __now():
    from datetime import datetime
    return datetime.utcnow()