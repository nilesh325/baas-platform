from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from src.database import async_db as db
from routes.auth import get_current_company

# --- Models ---

class TicketRequest(BaseModel):
    company: str
    email: EmailStr
    session_id: str
    query: str

class StatusUpdate(BaseModel):
    status: str

router = APIRouter()

# --- Endpoints ---

@router.post("/register_ticket")
async def register_ticket(request: TicketRequest):
    """
    Creates a new support ticket from the frontend query form.
    """
    try:
        ticket = {
            "ticket_id": str(ObjectId()),
            "company_id": request.company,
            "email": request.email,
            "session_id": request.session_id,
            "query": request.query,
            "status": "open",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        result = await db["tickets"].insert_one(ticket)

        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Database insertion failed")

        return {"message": "Ticket created", "ticket_id": ticket["ticket_id"]}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickets/{company_id}")
async def get_tickets(company_id: str, current_company: dict = Depends(get_current_company)):
    """
    Fetches all tickets for a specific company to display in the admin table.
    """
    if str(current_company["_id"]) != company_id:
        raise HTTPException(status_code=403, detail="Not authorized to access these tickets")

    try:
        tickets_cursor = db["tickets"].find({"company_id": company_id})
        tickets_list = []

        async for ticket in tickets_cursor:
            tickets_list.append({
                "ticket_id": ticket["ticket_id"],
                "email": ticket["email"],
                "query": ticket["query"],
                "status": ticket["status"],
                # Return ISO string so the frontend can format it consistently
                "created_at": ticket["created_at"].isoformat(),
            })

        return {"tickets": tickets_list}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update_ticket/{ticket_id}")
async def update_ticket(ticket_id: str, body: StatusUpdate, current_company: dict = Depends(get_current_company)):
    """
    Updates the status (open, in_progress, resolved) of a ticket.
    """
    try:
        ticket = await db["tickets"].find_one({"ticket_id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if str(ticket.get("company_id")) != str(current_company["_id"]):
            raise HTTPException(status_code=403, detail="Not authorized to modify this ticket")

        result = await db["tickets"].update_one(
            {"ticket_id": ticket_id},
            {"$set": {
                "status": body.status,
                # Convert UTC to IST (UTC+5:30)
                "updated_at": datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
            }}
        )

        return {"message": "updated"}

    except HTTPException:
        # Re-raise HTTP exceptions (e.g. 404) instead of swallowing them as 500
        raise
    except Exception as e:
        print(f"Error updating ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete_ticket/{ticket_id}")
async def delete_ticket(ticket_id: str, current_company: dict = Depends(get_current_company)):
    """
    Permanently removes a ticket from the database.
    """
    try:
        ticket = await db["tickets"].find_one({"ticket_id": ticket_id})
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        if str(ticket.get("company_id")) != str(current_company["_id"]):
            raise HTTPException(status_code=403, detail="Not authorized to delete this ticket")

        result = await db["tickets"].delete_one({"ticket_id": ticket_id})

        return {"message": "deleted"}

    except HTTPException:
        # Re-raise HTTP exceptions (e.g. 404) instead of swallowing them as 500
        raise
    except Exception as e:
        print(f"Error deleting ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))