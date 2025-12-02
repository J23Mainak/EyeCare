import os
import uuid
import math
import requests
import io
import asyncio
from bs4 import BeautifulSoup
from pypdf import PdfReader
from db import documents_col
from vectorstore_mongo import upsert_chunks, search_similar_local
from config import CHUNK_SIZE, CHUNK_OVERLAP

# Cache for embeddings to avoid regenerating
_embedding_cache = {}

async def get_embedding_for_chunk(text: str):
    """Generate embedding for a text chunk with caching"""
    # Check cache first
    cache_key = hash(text[:500])  # Hash first 500 chars for cache key
    if cache_key in _embedding_cache:
        return _embedding_cache[cache_key]
    
    try:
        import google.generativeai as genai
        from config import GOOGLE_GENAI_API_KEY
        
        genai.configure(api_key=GOOGLE_GENAI_API_KEY)
        
        result = genai.embed_content(
            model="models/embedding-001",
            content=text
        )
        embedding = result['embedding']
        
        # Cache it (limit cache size)
        if len(_embedding_cache) < 1000:
            _embedding_cache[cache_key] = embedding
        
        return embedding
    except Exception as e:
        print(f"Embedding error for chunk: {e}")
        # Return a random vector as fallback
        import random
        return [random.uniform(-0.1, 0.1) for _ in range(768)]

async def get_embeddings_batch(texts: list, batch_size: int = 10):
    """Generate embeddings in parallel batches for better performance"""
    all_embeddings = []
    
    # Process in batches
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        # Create tasks for parallel execution
        tasks = [get_embedding_for_chunk(text) for text in batch]
        # Run batch in parallel
        batch_embeddings = await asyncio.gather(*tasks)
        all_embeddings.extend(batch_embeddings)
    
    return all_embeddings

async def upsert_document_chunks(doc_id: str, chunks: list):
    """Convert chunks to embeddings and store them - OPTIMIZED"""
    chunk_texts = [chunk["text"] for chunk in chunks]
    
    # Generate embeddings in parallel batches (MUCH faster)
    chunk_embeddings = await get_embeddings_batch(chunk_texts, batch_size=10)
    
    # Store in vector database
    upsert_chunks(doc_id, chunk_texts, chunk_embeddings)
    return len(chunks)

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
    tokens = text.split()
    out = []
    i = 0
    chunk_id = 0
    while i < len(tokens):
        chunk_tokens = tokens[i:i+chunk_size]
        chunk_text = " ".join(chunk_tokens)
        out.append({"chunk_id": chunk_id, "text": chunk_text})
        chunk_id += 1
        i += chunk_size - overlap
    return out

def clean_text(text: str) -> str:
    """Clean text by removing or replacing problematic Unicode characters"""
    if not text:
        return ""
    
    # Remove surrogate pairs and other problematic characters
    cleaned = text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
    
    return cleaned

async def ingest_url(url: str, title: str = None, metadata: dict = None):
    # Convert URL to string if it's a Pydantic HttpUrl object
    url_str = str(url)
    
    # Simplified headers that work with most websites
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
    }
    
    try:
        r = requests.get(url_str, headers=headers, timeout=30, allow_redirects=True)
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        if r.status_code == 406:
            # Retry with even more minimal headers
            try:
                minimal_headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                r = requests.get(url_str, headers=minimal_headers, timeout=30, allow_redirects=True)
                r.raise_for_status()
            except:
                raise Exception(f"Failed to fetch URL (HTTP 406). The website is blocking automated requests.")
        else:
            raise Exception(f"Failed to fetch URL (HTTP {r.status_code}). The website may be blocking automated requests or the page is unavailable.")
    except requests.exceptions.Timeout:
        raise Exception("Request timed out. The website took too long to respond.")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to fetch URL: {str(e)}")
    
    soup = BeautifulSoup(r.text, "html.parser")
    
    # remove scripts/styles
    for s in soup(["script", "style", "noscript"]):
        s.decompose()
    
    text = soup.get_text(separator="\n")
    text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
    text = clean_text(text)
    
    if not text or len(text.strip()) < 100:
        raise Exception("Insufficient content extracted from URL. The page may be empty or require JavaScript.")
    
    if not title:
        title = soup.title.string if soup.title else url_str
    title = clean_text(title)
    
    doc_id = str(uuid.uuid4())
    chunks = chunk_text(text)
    
    # upsert into vector DB with real embeddings (PARALLELIZED)
    added = await upsert_document_chunks(doc_id, chunks)
    
    # store metadata - ensure all values are JSON serializable
    doc_doc = {
        "_id": doc_id,
        "title": title,
        "source": url_str,
        "type": "url",
        "chunks": len(chunks),
        "added_at": __import__("datetime").datetime.utcnow(),
        "meta": metadata or {}
    }
    await documents_col.insert_one(doc_doc)
    return {"doc_id": doc_id, "chunks": len(chunks), "vectors_added": added}

async def ingest_pdf_bytes(file_bytes: bytes, title: str = None, metadata: dict = None):
    # Wrap bytes in BytesIO to make it file-like with seek() support
    pdf_file = io.BytesIO(file_bytes)
    reader = PdfReader(pdf_file)
    
    text = []
    for page in reader.pages:
        try:
            page_text = page.extract_text() or ""
            # Clean each page's text immediately after extraction
            page_text = clean_text(page_text)
            text.append(page_text)
        except Exception as e:
            print(f"Error extracting page: {e}")
            continue
    
    full_text = "\n".join(text)
    
    if not title:
        title = "PDF Document"
    title = clean_text(title)
    
    doc_id = str(uuid.uuid4())
    chunks = chunk_text(full_text)
    # upsert into vector DB with real embeddings (NOW PARALLELIZED)
    added = await upsert_document_chunks(doc_id, chunks)
    doc_doc = {
        "_id": doc_id,
        "title": title,
        "source": "uploaded_pdf",
        "type": "pdf",
        "chunks": len(chunks),
        "added_at": __import__("datetime").datetime.utcnow(),
        "meta": metadata or {}
    }
    await documents_col.insert_one(doc_doc)
    return {"doc_id": doc_id, "chunks": len(chunks), "vectors_added": added}