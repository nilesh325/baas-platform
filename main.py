# main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routes.routes import router as companies_router
from routes.auth import router as auth_router
from src.pdf_database import router as pdf_router
from chatbot import router as chatbot_router
from comapny_profile import router as dynamic_router
from routes.dynamic_routes import router as dynamic_routing
from tickets import router as tickets_router 

from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# Configure CORS Origins
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_raw:
    origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]
else:
    # Safe default: allow local development and wildcards if unspecified
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if (origins != ["*"]) else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount compiled Vite React static assets if directory exists
if os.path.exists("frontend/dist"):
    app.mount("/static", StaticFiles(directory="frontend/dist"), name="static")
else:
    print("[Warning] 'frontend/dist' directory not found. Static files routing is disabled.")

# Include backend API/page routes
app.include_router(companies_router)
app.include_router(auth_router)
app.include_router(pdf_router)
app.include_router(chatbot_router) 
app.include_router(dynamic_router) 
app.include_router(dynamic_routing)
app.include_router(tickets_router) 

# Robust Catch-all Route for React Router Single Page Application (SPA)
@app.get("/{catchall:path}")
async def catch_all(catchall: str):
    # Exclude standard API prefixes to allow proper API 404 responses
    if any(catchall.startswith(prefix) for prefix in ["api/", "auth/", "company/", "tickets/", "raised/", "upload"]):
        return {"detail": "Not Found"}
    
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
        
    return {"status": "BAAS API is running successfully"}
