# external_ticket.py
import requests
from fastapi import APIRouter, Body
from pydantic import BaseModel

router = APIRouter()

TICKET_API_URL = "https://your-ticketing-service.com/api/v2/tickets.json"
API_USERNAME = "your_api_user@email.com"
API_PASSWORD = "your_api_token"

class TicketRequest(BaseModel):
    user_email: str
    user_name: str
    issue_summary: str
    chat_history: str

@router.post("/external_ticket")
def create_external_ticket(req: TicketRequest):
    ticket_data = {
        "ticket": {
            "subject": f"Chatbot Escalation: {req.issue_summary}",
            "comment": {
                "body": f"The user, {req.user_name}, requested a ticket for: {req.issue_summary}.\nChat Transcript:\n{req.chat_history}"
            },
            "requester": { "name": req.user_name, "email": req.user_email },
            "priority": "normal",
            "tags": ["chatbot-auto-create"]
        }
    }
    headers = { "Content-Type": "application/json" }
    auth = (API_USERNAME, API_PASSWORD)
    try:
        response = requests.post(
            TICKET_API_URL,
            json=ticket_data,
            headers=headers,
            auth=auth
        )
        response.raise_for_status()
        response_json = response.json()
        new_ticket_id = response_json.get("ticket", {}).get("id")
        return { "success": True, "ticket_id": new_ticket_id }
    except Exception as e:
        return { "success": False, "error_message": str(e) }