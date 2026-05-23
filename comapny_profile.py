import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from src.database import (
    Baas_companies_collection as companies_collection,
    companies_users,
    session_created,
    Raised_Tickets,
    companies_pdfs,
    companies_chunks,
    tickets
)
from routes.auth import get_current_company
from src.pdf_database import clear_caches

router = APIRouter()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Update Name
class NameRequest(BaseModel):
    company: str

@router.post("/updatename/{company_id}")
async def update_company(
    company_id: str,
    payload: NameRequest,
    current_company: dict = Depends(get_current_company)
):
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this company")

    try:
        obj_id = ObjectId(company_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = await companies_collection.update_one(
        {"_id": obj_id},
        {"$set": {"company": payload.company}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"message": "Updated successfully"}

# Update Email
class UpdateEmailRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/updateemail/{company_id}")
async def update_email(
    company_id: str,
    request: UpdateEmailRequest,
    current_company: dict = Depends(get_current_company)
):
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this company")

    try:
        obj_id = ObjectId(company_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    company = await companies_collection.find_one({"_id": obj_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    existing_company = await companies_collection.find_one({"email": request.email})
    if existing_company and str(existing_company.get("_id")) != company_id:
        raise HTTPException(status_code=400, detail="This email is already in use by different account")

    hashed_pass = company.get("password")
    if not hashed_pass or not pwd_context.verify(request.password, hashed_pass):
        raise HTTPException(status_code=401, detail="Invalid password")

    await companies_collection.update_one(
        {"_id": obj_id},
        {"$set": {"email": request.email}}
    )
    return {"message": "Email updated successfully"}

# Update Password
class UpdatePassword(BaseModel):
    password1: str
    password2: str
    current_password: str

@router.post("/updatepassword/{company_id}")
async def update_password(
    company_id: str,
    request: UpdatePassword,
    current_company: dict = Depends(get_current_company)
):
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this company")

    try:
        obj_id = ObjectId(company_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    company = await companies_collection.find_one({"_id": obj_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    curr_hashed_password = company.get("password")
    if not curr_hashed_password or not pwd_context.verify(request.current_password, curr_hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if request.password1 != request.password2:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    new_hashed_password = pwd_context.hash(request.password1)
    await companies_collection.update_one(
        {"_id": obj_id},
        {"$set": {"password": new_hashed_password}}
    )
    return {"message": "Password updated successfully"}

# Get Company
@router.get("/company/{company_id}")
async def get_company(
    company_id: str,
    current_company: dict = Depends(get_current_company)
):
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this company")

    try:
        obj_id = ObjectId(company_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    company = await companies_collection.find_one({"_id": obj_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return {
        "company": company.get("company", ""),
        "email": company.get("email", ""),
        "is_google": company.get("is_google", False) or not company.get("password")
    }

# Deactivate Account
@router.post("/deactivate/{company_id}")
async def deactivate_account(
    company_id: str,
    current_company: dict = Depends(get_current_company)
):
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to deactivate this company")

    try:
        obj_id = ObjectId(company_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = await companies_collection.update_one(
        {"_id": obj_id},
        {"$set": {"active": False, "status": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"message": "Account deactivated"}


class GoogleLinkRequest(BaseModel):
    token: str


@router.post("/link-google")
async def link_google(
    payload: GoogleLinkRequest,
    current_company: dict = Depends(get_current_company)
):
    try:
        google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        if not google_client_id:
            raise HTTPException(status_code=500, detail="Google Client ID not configured on server")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": payload.token},
                timeout=10.0
            )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")

        g_payload = response.json()

        # Security validations
        if g_payload.get("aud") != google_client_id:
            raise HTTPException(status_code=401, detail="Token audience mismatch")

        email = g_payload.get("email")
        email_verified = g_payload.get("email_verified")

        if not email or (email_verified != "true" and email_verified != True):
            raise HTTPException(status_code=401, detail="Google email not verified or missing")

        company_id = str(current_company["_id"])
        
        # Link Google account
        result = await companies_collection.update_one(
            {"_id": ObjectId(company_id)},
            {"$set": {"is_google": True}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Company not found")

        return {"message": "Google account linked successfully"}

    except HTTPException as e:
        raise e
    except Exception as e:
        print("GOOGLE LINK ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/unlink-google")
async def unlink_google(
    current_company: dict = Depends(get_current_company)
):
    try:
        company_id = str(current_company["_id"])
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        # Check if they have a password configured to avoid lockout
        if not company.get("password"):
            raise HTTPException(
                status_code=400,
                detail="You must configure a password in the Password section before unlinking Google to avoid locking yourself out."
            )

        await companies_collection.update_one(
            {"_id": ObjectId(company_id)},
            {"$set": {"is_google": False}}
        )

        return {"message": "Google account unlinked successfully"}

    except HTTPException as e:
        raise e
    except Exception as e:
        print("GOOGLE UNLINK ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.delete("/delete-account/{company_id}")
async def delete_account(
    company_id: str,
    current_company: dict = Depends(get_current_company)
):
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this company")

    try:
        company_obj_id = ObjectId(company_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    try:
        # 1. Clear FAISS index files and vector chunks
        await companies_chunks.delete_many({"company_id": company_obj_id})

        # 2. Clear PDF metadata
        await companies_pdfs.delete_many({"company_id": company_obj_id})

        # 3. Clear file system FAISS indexes & QA cache
        clear_caches(company_id, company_obj_id)

        # 4. Clear tickets
        await tickets.delete_many({"company_id": company_id})
        await Raised_Tickets.delete_many({"company_id": company_id})

        # 5. Clear chatbot sessions
        await session_created.delete_many({"company_id": company_id})

        # 6. Clear company chatbot client users
        await companies_users.delete_many({"company_id": company_id})

        # 7. Delete the company account itself
        result = await companies_collection.delete_one({"_id": company_obj_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Company not found")

        return {"message": "Account and all associated data have been permanently deleted"}

    except Exception as e:
        print("DELETE ACCOUNT ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")



    


