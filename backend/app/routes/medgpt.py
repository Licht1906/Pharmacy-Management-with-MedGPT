"""
API MedGPT - CHỈ 1 ENDPOINT CHAT DUY NHẤT
Mọi yêu cầu đều qua chat, MedGPT tự hiểu và xử lý
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.services.medgpt_service import medgpt_service

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"


@router.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Chat với MedGPT - endpoint DUY NHẤT
    
    MedGPT tự hiểu người dùng muốn gì:
    - Hỏi về thuốc → tra cứu thông tin thuốc
    - Hỏi tồn kho → tra cứu tồn kho
    - Hỏi thay thế → tìm thuốc thay thế
    - Hỏi hết hạn → báo cáo thanh lý
    - Hỏi mã thuốc → đề xuất mã
    - Yêu cầu tạo đơn → tạo đơn hàng
    - Hỏi chung → tư vấn y dược
    """
    result = medgpt_service.chat(db, request.message, request.session_id)
    return result