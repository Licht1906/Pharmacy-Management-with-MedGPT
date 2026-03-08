"""
FEFO = First Expired, First Out
Thuốc hết hạn trước PHẢI bán trước
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date
from app.models import DrugInventory


def get_available_batches(db, brand_drug_id, store_id):
    """Lấy các lô hàng, sắp xếp HSD gần nhất trước"""
    return db.query(DrugInventory).filter(
        and_(
            DrugInventory.brand_drug_id == brand_drug_id,
            DrugInventory.store_id == store_id,
            DrugInventory.status == 'ACTIVE',
            DrugInventory.quantity > 0,
            DrugInventory.expiry_date > date.today()
        )
    ).order_by(DrugInventory.expiry_date.asc()).all()


def allocate_stock(db, brand_drug_id, store_id, required_qty):
    """
    Phân bổ xuất kho theo FEFO
    
    VD: Cần 30 viên Panadol
    Lô A: HSD 2024-12-01, còn 10 → xuất 10
    Lô B: HSD 2025-01-15, còn 50 → xuất 20
    Tổng: 30 viên ✅
    """
    batches = get_available_batches(db, brand_drug_id, store_id)
    
    allocations = []
    remaining = required_qty
    
    for batch in batches:
        if remaining <= 0:
            break
        
        take = min(batch.quantity, remaining)
        allocations.append({
            'inventory_id': batch.inventory_id,
            'batch_number': batch.batch_number,
            'expiry_date': batch.expiry_date,
            'quantity': take
        })
        remaining -= take
    
    if remaining > 0:
        return None  # Không đủ hàng
    
    return allocations


def deduct_stock(db, allocations):
    """Trừ tồn kho sau khi bán"""
    for alloc in allocations:
        inventory = db.query(DrugInventory).filter(
            DrugInventory.inventory_id == alloc['inventory_id']
        ).first()
        
        if inventory:
            inventory.quantity -= alloc['quantity']
    
    db.commit()