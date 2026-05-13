"""API Thanh lý thuốc hết hạn"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services.medgpt_service import medgpt_service
from app.models import DrugInventory
from pydantic import BaseModel
from app.dependencies import get_current_user, CurrentUser

class DisposeRequest(BaseModel):
    inventory_ids: list[int]


router = APIRouter()


@router.get("/report")
def get_disposal_report(
    store_id: Optional[int] = None,
    days: int = 90,
    db: Session = Depends(get_db),
    current_user: Optional[CurrentUser] = Depends(get_current_user)
):
    """Báo cáo thuốc cần thanh lý"""
    if current_user and current_user.role != 'OWNER':
        store_id = current_user.store_id
    return medgpt_service.get_expiring_drugs(db, store_id, days)

@router.post("/dispose")
def dispose_drugs(request: DisposeRequest, db: Session = Depends(get_db)):
    """Thanh lý danh sách lô thuốc (chuyển số lượng về 0 & cập nhật trạng thái nếu cần)"""
    if not request.inventory_ids:
        return {"success": False, "message": "Không có lô thuốc nào được chọn."}
        
    inventories = db.query(DrugInventory).filter(
        DrugInventory.inventory_id.in_(request.inventory_ids)
    ).all()
    
    count = 0
    for inv in inventories:
        inv.quantity = 0
        inv.status = 'DISPOSED'
        count += 1
        
    db.commit()
    return {"success": True, "message": f"Đã thanh lý thành công {count} lô thuốc!"}