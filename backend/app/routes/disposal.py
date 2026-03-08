"""API Thanh lý thuốc hết hạn"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services.medgpt_service import medgpt_service

router = APIRouter()


@router.get("/report")
def get_disposal_report(
    store_id: Optional[int] = None,
    days: int = 90,
    db: Session = Depends(get_db)
):
    """Báo cáo thuốc cần thanh lý"""
    return medgpt_service.get_expiring_drugs(db, store_id, days)