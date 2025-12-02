import uvicorn
from fastapi import FastAPI
from chat_routes import router as chat_router
from config import PORT, GOOGLE_GENAI_API_KEY
from google import genai
import google.generativeai as genai
from config import GOOGLE_GENAI_API_KEY
import logging
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="iCare - RAG Chat Service")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8501",
        "http://localhost:8502"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure genai
genai.configure(api_key=GOOGLE_GENAI_API_KEY)

# You can still create a client for chat completion if needed
genai_client = genai.GenerativeModel('gemini-2.5-pro')

# Attach router
app.include_router(chat_router, prefix="/api/rag", tags=["rag"])

# simple root
@app.get("/")
def root():
    return {"status": "iCare RAG service", "ok": True}

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
