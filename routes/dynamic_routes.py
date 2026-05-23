from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse, FileResponse
from pydantic import BaseModel, EmailStr
from bson import ObjectId
from src.database import session_created, Baas_companies_collection as companies_collection

router = APIRouter()


# ✅ Request model
class SessionRequest(BaseModel):
    company_id: str
    email: EmailStr


# ─────────────────────────────────────────────────────────────
# Step 1: Serve login page
# ─────────────────────────────────────────────────────────────
@router.get("/ai/{company_id}/login")
async def get_login(company_id: str):
    return FileResponse("frontend/dist/index.html")


# ─────────────────────────────────────────────────────────────
# Step 2: Create session
# ─────────────────────────────────────────────────────────────
@router.post("/ai/{company_id}/logined")
async def create_session(company_id: str, body: SessionRequest):
    try:
        if body.company_id != company_id:
            raise HTTPException(status_code=400, detail="Company ID mismatch")

        # Check existing session
        existing = await session_created.find_one({
            "company_id": company_id,
            "email": body.email
        })

        if existing:
            return {
                "redirect_url": f"/ai/{company_id}/{str(existing['_id'])}"
            }

        # Create new session
        session_obj_id = ObjectId()
        session_id = str(session_obj_id)

        new_session = {
            "_id": session_obj_id,
            "company_id": company_id,
            "email": body.email,
            "created_at": datetime.utcnow(),
            "summary": "",
            "messages": [],
            "last_message": ""
        }
        print("EMAIL VALUE:", body.email, type(body.email))
        await session_created.insert_one(new_session)

        return {
            "redirect_url": f"/ai/{company_id}/{session_id}"
        }

    except Exception as e:
        print("SESSION ERROR:", e)  # 🔥 important for debugging
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ─────────────────────────────────────────────────────────────
# Step 3: Serve chatbot
# ─────────────────────────────────────────────────────────────
@router.get("/ai/{company_id}/{session_id}")
async def serve_chatbot(company_id: str, session_id: str):
    try:
        session_obj_id = ObjectId(session_id)
    except Exception:
        return RedirectResponse(url=f"/ai/{company_id}/login")

    session = await session_created.find_one({
        "_id": session_obj_id,
        "company_id": company_id
    })
    if not session:
        return RedirectResponse(url=f"/ai/{company_id}/login")

    return FileResponse("frontend/dist/index.html")


# ─────────────────────────────────────────────────────────────
# Session history update
# ─────────────────────────────────────────────────────────────
async def update_session_history(session_id: str, user_query: str, bot_response: str):
    try:
        session_obj_id = ObjectId(session_id)
    except Exception:
        return

    session = await session_created.find_one({"_id": session_obj_id})

    if not session:
        return

    messages = session.get("messages", [])
    current_summary = session.get("summary", "")

    messages.append({"role": "user", "content": user_query})
    messages.append({"role": "assistant", "content": bot_response})

    # Keep last 10 messages
    if len(messages) > 10:
        messages = messages[-10:]

    await session_created.update_one(
        {"_id": session_obj_id},
        {
            "$set": {
                "messages": messages,
                "last_message": bot_response
            }
        }
    )


@router.get("/companyname/{company_id}")
async def get_company(company_id: str):
    try:
        obj_id = ObjectId(company_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    company = await companies_collection.find_one({"_id": obj_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return {
        "company": company.get("company", "")
    }