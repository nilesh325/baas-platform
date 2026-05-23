import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# Load environment variables
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# ---------------------------
# ASYNC CLIENT (FastAPI routes)
# ---------------------------
async_client = AsyncIOMotorClient(MONGO_URL)
async_db = async_client["BAAS"]

Baas_companies_collection = async_db["companies"]
companies_users = async_db["companies_users"]
session_created = async_db["session_created"]
Raised_Tickets = async_db["raised_tickets"]
companies_pdfs=async_db["companies_pdfs"]
# async handle — used in pdf_database.py (upload/delete are async routes)
companies_chunks = async_db["companies_chunks"]
tickets=async_db["tickets"]


# ---------------------------
# SYNC CLIENT (RAG / threadpool)
# ---------------------------
sync_client = MongoClient(MONGO_URL)
sync_db = sync_client["BAAS"]

companies_pdfs_sync = sync_db["companies_pdfs"]
qa_cache_collection = sync_db["qa_cache"]
companies_chunks_sync = sync_db["companies_chunks"]


