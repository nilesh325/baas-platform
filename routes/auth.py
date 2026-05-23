import os
import jwt
import httpx
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from src.database import Baas_companies_collection as companies_collection
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-bass-project-2026")
JWT_ALGORITHM = "HS256"


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=1)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_company(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        company_id: str = payload.get("company_id")
        if company_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload: missing company_id")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    from bson import ObjectId
    try:
        obj_id = ObjectId(company_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload format")

    company = await companies_collection.find_one({"_id": obj_id})
    if not company:
        raise HTTPException(status_code=401, detail="Company not found")

    if not company.get("status", True):
        raise HTTPException(status_code=401, detail="Company account is deactivated")

    return company


class User(BaseModel):
    company: str | None = None
    email: EmailStr
    password: str


# ─────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────
@router.post("/register")
async def register(user: User):
    try:
        # ✅ FIX: await
        existing = await companies_collection.find_one({"email": user.email})

        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        safe_password = user.password[:72]
        hashed_pw = pwd_context.hash(safe_password)

        company_doc = {
            "company": user.company,
            "email": user.email,
            "password": hashed_pw,
            "status": True
        }

        # ✅ FIX: await
        res = await companies_collection.insert_one(company_doc)
        company_id = str(res.inserted_id)
        token = create_access_token({"company_id": company_id, "email": user.email})

        return {
            "message": "User registered successfully",
            "redirect": "/home",
            "company_id": company_id,
            "access_token": token
        }
    except HTTPException as e:
        # ✅ Re-raise without converting to 500
        raise e
    except Exception as e:
        print("REGISTER ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ─────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────
@router.post("/login")
async def login(user: User):
    try:
        company = await companies_collection.find_one({"email": user.email})

        if not company:
            raise HTTPException(status_code=400, detail="User not found")

        if not pwd_context.verify(user.password, company["password"]):
            raise HTTPException(status_code=400, detail="Invalid password")

        if not company.get("status", True):
            await companies_collection.update_one(
                {"_id": company["_id"]},
                {"$set": {"status": True}}
            )

        company_id = str(company["_id"])
        token = create_access_token({"company_id": company_id, "email": user.email})

        return {
            "message": "Login successful",
            "redirect": "/home",
            "company_id": company_id,
            "access_token": token
        }
    except HTTPException as e:
        # ✅ Re-raise without converting to 500
        raise e

    except Exception as e:
        print("LOGIN ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")


class GoogleAuthRequest(BaseModel):
    token: str


@router.post("/auth/google")
async def google_auth(request: GoogleAuthRequest):
    try:
        # Validate the ID Token with Google's public tokeninfo API using httpx
        google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        if not google_client_id:
            raise HTTPException(status_code=500, detail="Google Client ID not configured on server")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": request.token},
                timeout=10.0
            )

        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")

        payload = response.json()

        # Security validations
        if payload.get("aud") != google_client_id:
            raise HTTPException(status_code=401, detail="Token audience mismatch")

        email = payload.get("email")
        email_verified = payload.get("email_verified")
        name = payload.get("name", "Google User")

        if not email or (email_verified != "true" and email_verified != True):
            raise HTTPException(status_code=401, detail="Google email not verified or missing")

        # Check if company exists in database
        company = await companies_collection.find_one({"email": email})

        if company:
            # Login existing company
            if not company.get("status", True):
                await companies_collection.update_one(
                    {"_id": company["_id"]},
                    {"$set": {"status": True}}
                )

            company_id = str(company["_id"])
            token = create_access_token({"company_id": company_id, "email": email})

            return {
                "message": "Login successful",
                "redirect": "/home",
                "company_id": company_id,
                "access_token": token
            }
        else:
            # Register new company automatically
            company_doc = {
                "company": name,
                "email": email,
                "password": "",  # Empty password indicating Google Login
                "status": True
            }

            res = await companies_collection.insert_one(company_doc)
            company_id = str(res.inserted_id)
            token = create_access_token({"company_id": company_id, "email": email})

            return {
                "message": "User registered successfully",
                "redirect": "/home",
                "company_id": company_id,
                "access_token": token
            }

    except HTTPException as e:
        raise e
    except Exception as e:
        print("GOOGLE AUTH ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")



