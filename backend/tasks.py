# backend/tasks.py
from celery import Celery
import time
import random

# Broker/backend changed – runs entirely in‑process
celery = Celery(
    "ticketpilot_tasks",
    broker="memory://",            # 💡 internal memory queue
    backend="rpc://"               # lightweight result backend
)

@celery.task
def run_auto_fix(ticket_id: str):
    print(f"[AutoFix] Running background fix for ticket {ticket_id}")
    time.sleep(3)
    confidence = round(random.uniform(0.7, 0.98), 3)
    print(f"[AutoFix] Done with confidence {confidence}")
    return {"ticket_id": ticket_id, "confidence": confidence}