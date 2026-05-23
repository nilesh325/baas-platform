"""
chatbot.py — PDF-RAG chatbot using MongoDB chunk store.

Retrieval model (post-upload refactor):
  - No FAISS, no raw PDF bytes, no PyPDF2, no LangChain splitter
  - Chunks + embeddings live in `companies_chunks` (written at upload time)
  - At query time: embed the question → cosine rank all company chunks → top-K
  - Everything else (QA cache, per-company lock, reranking, LangGraph, dynamic
    token budget) is preserved and cleaned up.
"""

from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timezone

import numpy as np
from bson import ObjectId
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, Form, HTTPException
from langchain_mistralai import ChatMistralAI
from langgraph.graph import StateGraph
from src.embeddings import get_embedding_model

from src.database import companies_chunks_sync, qa_cache_collection

load_dotenv()
router = APIRouter()
_env_path = Path(__file__).parent / ".env"
print(f"[DEBUG] .env path: {_env_path}")
print(f"[DEBUG] .env exists: {_env_path.exists()}")
load_dotenv(dotenv_path=_env_path, override=True)
router = APIRouter()
# ── Constants ─────────────────────────────────────────────────────────────────
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
if not MISTRAL_API_KEY:
    raise ValueError("MISTRAL_API_KEY not found in environment")

# Must match the model used in pdf_database.py at upload time
_EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

GREETINGS = {"hi", "hello", "hey", "ok", "okay", "wow", "thanks", "bye", "test"}

# How many chunks to pull from Mongo before reranking
_INITIAL_RETRIEVE_K = 20
# Final top-K passed to the LLM
_RERANK_TOP_K = 5


# ── Singletons ────────────────────────────────────────────────────────────────

_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = get_embedding_model(_EMBED_MODEL_NAME)
    return _embedder


_llm_classifier: ChatMistralAI | None = None

def get_classifier_llm() -> ChatMistralAI:
    global _llm_classifier
    if _llm_classifier is None:
        _llm_classifier = ChatMistralAI(
            mistral_api_key=MISTRAL_API_KEY,
            model="mistral-medium-2505",  # ← fixed
            temperature=0.0,
            max_tokens=10,
        )
    return _llm_classifier


def get_answer_llm(max_tokens: int) -> ChatMistralAI:
    return ChatMistralAI(
        mistral_api_key=MISTRAL_API_KEY,
        model="mistral-medium-2505",  # ← fixed (was "ministral-small")
        temperature=0.2,
        max_tokens=max_tokens,
    )#14WWkC8Pv4BMj2XOVsbvYgGaZjh6HAfW


# ── Per-company concurrency lock ──────────────────────────────────────────────

_company_locks: dict[str, asyncio.Lock] = {}

def get_company_lock(company_id: str) -> asyncio.Lock:
    if company_id not in _company_locks:
        _company_locks[company_id] = asyncio.Lock()
    return _company_locks[company_id]


# ── Text helpers ──────────────────────────────────────────────────────────────

def normalize_question(q: str) -> str:
    return re.sub(r"\s+", " ", q.lower().strip())


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a / (np.linalg.norm(a) + 1e-10)
    b = b / (np.linalg.norm(b) + 1e-10)
    return float(np.dot(a, b))


# ── Retrieval — pure MongoDB, no FAISS ───────────────────────────────────────

def retrieve_chunks(
    company_object_id: ObjectId,
    question: str,
    initial_k: int = _INITIAL_RETRIEVE_K,
    top_k: int = _RERANK_TOP_K,
) -> list[str]:
    """
    1. Embed the question.
    2. Load all stored chunk embeddings for this company (sync).
    3. Cosine-rank them against the question embedding.
    4. Return the text of the top-K chunks.

    For collections beyond ~50 k chunks per company, replace steps 2-3 with a
    MongoDB Atlas Vector Search $vectorSearch aggregation stage.
    """
    embedder = get_embedder()
    q_vec = embedder.encode([question], show_progress_bar=False)[0]

    # Fetch only the fields we need — no raw PDF data
    cursor = companies_chunks_sync.find(
        {"company_id": company_object_id},
        {"text": 1, "embedding": 1},
    )
    docs = list(cursor)

    if not docs:
        return []

    # Score every chunk
    scored: list[tuple[float, str]] = []
    for doc in docs:
        emb = np.array(doc["embedding"], dtype=np.float32)
        score = cosine_similarity(q_vec, emb)
        scored.append((score, doc["text"]))

    # Sort descending, take top-K
    scored.sort(key=lambda x: x[0], reverse=True)
    return [text for _, text in scored[:top_k]]


# ── Dynamic token budget ────────────────────────────────────────────────────

def classify_max_tokens(question: str) -> int:
    """Use the cheap classifier LLM to estimate a token budget."""
    try:
        prompt = (
            f'The user asked: "{question}"\n'
            "Decide the maximum number of tokens needed to answer this fully.\n"
            "Return ONLY a number, nothing else."
        )
        raw = get_classifier_llm().invoke(prompt).content.strip()
        match = re.search(r"\d+", raw)
        return max(300, min(1500, int(match.group()))) if match else 800
    except Exception:
        return 800


# ── QA cache ──────────────────────────────────────────────────────────────────

def get_cached_answer(company_id: str, question: str) -> str | None:
    cached = qa_cache_collection.find_one(
        {"company_id": company_id, "question": normalize_question(question)}
    )
    if cached:
        print("[cache] QA hit")
        return cached["answer"]
    return None


def save_answer_to_cache(company_id: str, question: str, answer: str) -> None:
    qa_cache_collection.update_one(
        {"company_id": company_id, "question": normalize_question(question)},
        {"$set": {"answer": answer, "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )


# ── LangGraph two-pass answer pipeline ───────────────────────────────────────

def build_rag_graph(question: str, chunks: list[str], max_tokens: int):
    """
    Two-node LangGraph:
      retrieve → answer

    'retrieve' just packages the already-fetched chunks into state.
    'answer'   runs two LLM passes: raw extraction then polish.
    """
    llm = get_answer_llm(max_tokens)
    context = "\n\n---\n\n".join(chunks)

    def retrieve_node(state: dict) -> dict:
        return {"context": context}

    def answer_node(state: dict) -> dict:
        ctx = state["context"]

        # Pass 1 — raw extraction
        raw = llm.invoke(
            f"""You are a professional AI assistant.
Rules:
- Answer ONLY from the provided documents
- No hallucination
- If not found, say exactly: I could not find this information in the uploaded PDFs.
- Plain text only; no markdown, no bullet points, no special characters

Documents:
{ctx}

Question: {question}"""
        ).content.strip()

        # Pass 2 — polish and trim to budget
        polished = llm.invoke(
            f"""Rewrite this answer to be concise, clear, and professional.
Remove repetition. Plain text only — no symbols like *, $, #.
Maximum {max_tokens} tokens.

Answer:
{raw}"""
        ).content.strip()

        return {"answer": polished}

    graph = StateGraph(dict)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("answer",   answer_node)
    graph.add_edge("retrieve", "answer")
    graph.set_entry_point("retrieve")
    graph.set_finish_point("answer")

    return graph.compile()


# ── Core pipeline (runs in executor thread) ───────────────────────────────────

def run_pipeline(
    company_id: str,
    company_object_id: ObjectId,
    question: str,
) -> str:
    # Fast path — greeting
    if normalize_question(question) in GREETINGS:
        return "Hello! Ask me anything about the uploaded documents."

    # Fast path — QA cache
    cached = get_cached_answer(company_id, question)
    if cached:
        return cached

    # Retrieve relevant chunks from MongoDB
    chunks = retrieve_chunks(company_object_id, question)
    if not chunks:
        return "I could not find this information in the uploaded PDFs."

    # Dynamic token budget
    max_tokens = classify_max_tokens(question)
    print(f"[pipeline] max_tokens={max_tokens}, chunks={len(chunks)}")

    # LangGraph two-pass answer
    rag_graph = build_rag_graph(question, chunks, max_tokens)
    result = rag_graph.invoke({})
    answer = result.get(
        "answer",
        "I could not find this information in the uploaded PDFs.",
    )

    save_answer_to_cache(company_id, question, answer)
    return answer


# ── API endpoint ──────────────────────────────────────────────────────────────

@router.post("/ask")
async def ask_question(
    company_id: str = Form(...),
    question: str = Form(...),
):
    try:
        company_object_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company_id")

    lock = get_company_lock(company_id)
    async with lock:
        loop = asyncio.get_event_loop()
        answer = await loop.run_in_executor(
            None,
            run_pipeline,
            company_id,
            company_object_id,
            question,
        )

    return {"answer": answer}