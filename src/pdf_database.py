"""
pdf_database.py — Upload, retrieve, and delete PDF knowledge chunks.

Storage model:
  companies_pdfs   → metadata only (filename, size, hash, chunk_count, status)
  companies_chunks → one doc per chunk: {text, embedding, source, page_num}

Upload pipeline (hybrid text + vision):
  For every page in the PDF:
    ① PyMuPDF  → extract text layer
    ② If text is thin (<MIN_TEXT_WORDS words) → render page as PNG
                                               → call Pixtral-12b via raw httpx
                                               → get a rich text description
    ③ Merge real text + vision description → clean → chunk → embed → store

Vision is called via plain httpx so there is no conflict with the vendored
mistralai copy that langchain_mistralai bundles internally.
"""

from __future__ import annotations

import base64
import hashlib
import os
import re
import shutil
from datetime import datetime

import httpx
import pymupdf                                         # pip install pymupdf
from bson import ObjectId
from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile, Depends
from sentence_transformers import SentenceTransformer  # pip install sentence-transformers

from .database import companies_chunks, companies_pdfs, qa_cache_collection
from routes.auth import get_current_company

# ── Config ────────────────────────────────────────────────────────────────────

FAISS_BASE_PATH  = os.getenv("FAISS_BASE_PATH", "/tmp/faiss_cache")
MISTRAL_API_KEY  = os.getenv("MISTRAL_API_KEY", "")
VISION_MODEL     = "pixtral-12b-2409"
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

MISTRAL_API_URL  = "https://api.mistral.ai/v1/chat/completions"

# Pages with fewer than this many words trigger the vision model
MIN_TEXT_WORDS   = 50
# PNG render resolution sent to vision model
PAGE_RENDER_DPI  = 150
# Chunking config
CHUNK_SIZE       = 500
CHUNK_OVERLAP    = 80

router = APIRouter()


# ── Singletons ────────────────────────────────────────────────────────────────

_embedder: SentenceTransformer | None = None

def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(EMBED_MODEL_NAME)
    return _embedder


# ── Vision helper (plain httpx — no mistralai SDK) ────────────────────────────

def describe_page_image(png_bytes: bytes, page_num: int) -> str:
    """
    Send a rendered PDF page (PNG bytes) to Pixtral-12b via the Mistral
    REST API directly. Returns a detailed natural-language description.
    Uses httpx so it is completely isolated from the langchain_mistralai
    vendored SDK that causes the ImportError.
    """
    if not MISTRAL_API_KEY:
        raise RuntimeError("MISTRAL_API_KEY not set")

    b64      = base64.standard_b64encode(png_bytes).decode()
    data_url = f"data:image/png;base64,{b64}"

    payload = {
        "model": VISION_MODEL,
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                    {
                        "type": "text",
                        "text": (
                            f"You are a document analyst. This is page {page_num + 1} "
                            "of a PDF document. Describe EVERYTHING you see in full "
                            "detail: all text, labels, numbers, diagram components, "
                            "arrows, relationships, legends, captions, and any visual "
                            "concepts shown. Write in clear paragraphs so the description "
                            "can be used to answer questions about this page. "
                            "Do not say 'the image shows' — just describe the content directly."
                        ),
                    },
                ],
            }
        ],
    }

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type":  "application/json",
    }

    response = httpx.post(
        MISTRAL_API_URL,
        json=payload,
        headers=headers,
        timeout=60.0,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


# ── Per-page extraction (hybrid text + vision) ────────────────────────────────

def extract_pages(pdf_bytes: bytes) -> list[dict]:
    """
    Process every PDF page.
    Returns list of {page_num, text, source} where source is
    "text" | "vision" | "hybrid".
    """
    doc   = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    pages: list[dict] = []

    for page_num, page in enumerate(doc):
        real_text  = page.get_text("text").strip()
        word_count = len(real_text.split())

        if word_count >= MIN_TEXT_WORDS:
            pages.append({
                "page_num": page_num,
                "text":     real_text,
                "source":   "text",
            })
            print(f"[page {page_num+1}] text ({word_count} words)")

        else:
            print(f"[page {page_num+1}] vision (only {word_count} words of text)")
            try:
                mat       = pymupdf.Matrix(PAGE_RENDER_DPI / 72, PAGE_RENDER_DPI / 72)
                pix       = page.get_pixmap(matrix=mat, alpha=False)
                png_bytes = pix.tobytes("png")
                vision_desc = describe_page_image(png_bytes, page_num)

                if real_text:
                    combined = f"{real_text}\n\n{vision_desc}"
                    source   = "hybrid"
                else:
                    combined = vision_desc
                    source   = "vision"

                pages.append({
                    "page_num": page_num,
                    "text":     combined,
                    "source":   source,
                })

            except Exception as exc:
                print(f"[page {page_num+1}] vision failed: {exc} — text fallback")
                pages.append({
                    "page_num": page_num,
                    "text":     real_text or f"[Page {page_num+1}: content could not be extracted]",
                    "source":   "text",
                })

    doc.close()
    return pages


# ── Text helpers ──────────────────────────────────────────────────────────────

def clean_text(raw: str) -> str:
    text = re.sub(r"[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]", " ", raw)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str) -> list[str]:
    words  = text.split()
    chunks: list[str] = []
    start  = 0
    while start < len(words):
        end   = min(start + CHUNK_SIZE, len(words))
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end == len(words):
            break
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    vectors = get_embedder().encode(chunks, batch_size=32, show_progress_bar=False)
    return [v.tolist() for v in vectors]


# ── Cache helpers ─────────────────────────────────────────────────────────────

def clear_caches(company_id: str, company_object_id: ObjectId) -> None:
    faiss_path = os.path.join(FAISS_BASE_PATH, company_id)
    if os.path.exists(faiss_path):
        shutil.rmtree(faiss_path)
        print(f"[cache] Cleared FAISS for {company_id}")

    companies_pdfs.update_many(
        {"company_id": company_object_id},
        {"$unset": {"extracted_text": ""}},
    )
    qa_cache_collection.delete_many({"company_id": company_id})
    print(f"[cache] Cleared QA cache for {company_id}")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    company_id: str  = Form(...),
    current_company: dict = Depends(get_current_company)
):
    if not company_id or company_id == "null":
        raise HTTPException(status_code=400, detail="Invalid company_id")
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to perform upload for this company")
    try:
        company_object_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ObjectId format")

    pdf_bytes = await file.read()
    file_size = len(pdf_bytes)
    file_hash = hashlib.sha256(pdf_bytes).hexdigest()

    # ── 1. Extract (hybrid text + vision per page) ────────────────────────────
    try:
        pages = extract_pages(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF extraction failed: {exc}")

    if not pages:
        raise HTTPException(status_code=422, detail="No pages could be extracted.")

    # ── 2. Chunk (per page, carry page metadata) ──────────────────────────────
    all_chunks: list[dict] = []
    for page in pages:
        cleaned = clean_text(page["text"])
        if not cleaned:
            continue
        for chunk_str in chunk_text(cleaned):
            all_chunks.append({
                "text":     chunk_str,
                "page_num": page["page_num"],
                "source":   page["source"],
            })

    if not all_chunks:
        raise HTTPException(status_code=422, detail="Text chunking produced no results.")

    # ── 3. Embed ──────────────────────────────────────────────────────────────
    try:
        embeddings = embed_chunks([c["text"] for c in all_chunks])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}")

    # ── 4. Persist PDF metadata ───────────────────────────────────────────────
    vision_pages = sum(1 for p in pages if p["source"] in ("vision", "hybrid"))
    pdf_doc = {
        "company_id":   company_object_id,
        "filename":     file.filename,
        "size":         file_size,
        "hash":         file_hash,
        "status":       "processed",
        "chunk_count":  len(all_chunks),
        "page_count":   len(pages),
        "vision_pages": vision_pages,
        "uploadedAt":   datetime.utcnow(),
    }
    result = await companies_pdfs.insert_one(pdf_doc)
    pdf_id = result.inserted_id

    # ── 5. Persist chunks + embeddings ────────────────────────────────────────
    chunk_docs = [
        {
            "company_id":  company_object_id,
            "pdf_id":      pdf_id,
            "filename":    file.filename,
            "chunk_index": i,
            "text":        c["text"],
            "embedding":   emb,
            "page_num":    c["page_num"],
            "source":      c["source"],
        }
        for i, (c, emb) in enumerate(zip(all_chunks, embeddings))
    ]
    await companies_chunks.insert_many(chunk_docs)

    # ── 6. Clear stale caches ─────────────────────────────────────────────────
    clear_caches(company_id, company_object_id)

    print(
        f"[upload] {file.filename} — {len(pages)} pages, "
        f"{vision_pages} vision, {len(all_chunks)} chunks"
    )

    return {
        "id":           str(pdf_id),
        "filename":     file.filename,
        "size":         file_size,
        "status":       "processed",
        "chunk_count":  len(all_chunks),
        "page_count":   len(pages),
        "vision_pages": vision_pages,
        "uploadedAt":   pdf_doc["uploadedAt"].isoformat(),
    }


@router.get("/get-pdfs")
async def get_pdfs(company_id: str, current_company: dict = Depends(get_current_company)):
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized for this company")
    try:
        company_object_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid company ID")

    cursor   = companies_pdfs.find(
        {"company_id": company_object_id},
        {"_id": 1, "filename": 1, "size": 1, "status": 1, "chunk_count": 1, "vision_pages": 1},
    )
    pdf_list = await cursor.to_list(length=None)

    return {
        "pdfs": [
            {
                "id":           str(pdf["_id"]),
                "filename":     pdf["filename"],
                "size":         pdf["size"],
                "status":       pdf.get("status", "processed"),
                "chunk_count":  pdf.get("chunk_count", 0),
                "vision_pages": pdf.get("vision_pages", 0),
            }
            for pdf in pdf_list
        ]
    }


@router.delete("/delete-pdf")
async def delete_pdf(payload: dict = Body(...), current_company: dict = Depends(get_current_company)):
    company_id = payload.get("company_id")
    pdf_id     = payload.get("pdf_id")

    if not company_id or not pdf_id:
        raise HTTPException(status_code=400, detail="Missing company_id or pdf_id")
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized for this company")
    try:
        pdf_obj_id     = ObjectId(pdf_id)
        company_obj_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = await companies_pdfs.delete_one({"_id": pdf_obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="PDF not found")

    deleted = await companies_chunks.delete_many({"pdf_id": pdf_obj_id})
    print(f"[delete] Removed {deleted.deleted_count} chunks for pdf {pdf_id}")

    clear_caches(company_id, company_obj_id)
    return {"message": "Deleted successfully"}