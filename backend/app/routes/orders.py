"""API Đơn hàng"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models import (
    Order, OrderDetail, BrandDrug, DrugPrice,
    Customer, Store, DrugInventory
)
from app.utils.fefo_handler import allocate_stock, deduct_stock
from sqlalchemy import or_, and_
from app.dependencies import get_current_user, CurrentUser

router = APIRouter()


# === Request/Response schemas ===

class OrderItemRequest(BaseModel):
    brand_drug_id: int
    quantity: int

class OrderCreateRequest(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    store_id: int
    employee_id: Optional[int] = 1
    items: List[OrderItemRequest]
    notes: Optional[str] = None


# === API: TẠO ĐƠN HÀNG ===

@router.post("/create")
def create_order(request: OrderCreateRequest, db: Session = Depends(get_db), current_user: Optional[CurrentUser] = Depends(get_current_user)):
    """Tạo đơn hàng mới - tự động FEFO"""
    
    if current_user and current_user.role != 'OWNER':
        request.store_id = current_user.store_id
    
    # Tạo mã đơn
    order_code = f"DH-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Tìm/tạo khách hàng
    customer_id = None
    if request.customer_phone:
        customer = db.query(Customer).filter(
            Customer.phone == request.customer_phone
        ).first()
        
        if not customer:
            customer = Customer(
                full_name=request.customer_name,
                phone=request.customer_phone
            )
            db.add(customer)
            db.flush()
        
        customer_id = customer.customer_id
    
    # Tạo đơn hàng
    order = Order(
        order_code=order_code,
        customer_id=customer_id,
        store_id=request.store_id,
        employee_id=request.employee_id,
        order_type='DIRECT',
        status='PENDING',
        notes=request.notes
    )
    db.add(order)
    db.flush()
    
    total = 0
    details_info = []
    
    for item in request.items:
        # Lấy giá
        price = db.query(DrugPrice).filter(
            and_(
                DrugPrice.brand_drug_id == item.brand_drug_id,
                DrugPrice.effective_date <= date.today(),
                or_(DrugPrice.end_date == None, DrugPrice.end_date >= date.today())
            )
        ).first()
        
        if not price:
            raise HTTPException(
                status_code=400,
                detail=f"Không tìm thấy giá cho thuốc ID {item.brand_drug_id}"
            )
        
        # Phân bổ FEFO
        allocations = allocate_stock(
            db, item.brand_drug_id, request.store_id, item.quantity
        )
        
        if allocations is None:
            drug = db.query(BrandDrug).filter(
                BrandDrug.brand_drug_id == item.brand_drug_id
            ).first()
            raise HTTPException(
                status_code=400,
                detail=f"Không đủ hàng: {drug.brand_name if drug else 'N/A'} (cần {item.quantity})"
            )
        
        # Tạo chi tiết đơn
        for alloc in allocations:
            line_total = float(price.selling_price) * alloc['quantity']
            total += line_total
            
            detail = OrderDetail(
                order_id=order.order_id,
                item_type='DRUG',
                brand_drug_id=item.brand_drug_id,
                inventory_id=alloc['inventory_id'],
                quantity=alloc['quantity'],
                unit_price=float(price.selling_price),
                line_total=line_total,
                batch_number=alloc['batch_number'],
                expiry_date=alloc['expiry_date']
            )
            db.add(detail)
            
            details_info.append({
                "brand_drug_id": item.brand_drug_id,
                "batch": alloc['batch_number'],
                "expiry": alloc['expiry_date'].isoformat(),
                "qty": alloc['quantity'],
                "subtotal": line_total
            })
        
        # Trừ tồn kho
        deduct_stock(db, allocations)
    
    order.total_amount = total
    order.final_amount = total
    order.status = 'COMPLETED'
    db.commit()
    
    return {
        "order_id": order.order_id,
        "order_code": order.order_code,
        "status": "COMPLETED",
        "total_amount": total,
        "details": details_info,
        "message": "Tạo đơn hàng thành công!"
    }


# === API: DANH SÁCH ĐƠN HÀNG ===

@router.get("/list")
def list_orders(
    store_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[CurrentUser] = Depends(get_current_user)
):
    query = db.query(Order)
    
    if current_user and current_user.role != 'OWNER':
        query = query.filter(Order.store_id == current_user.store_id)
    elif store_id:
        query = query.filter(Order.store_id == store_id)
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.order_by(Order.order_date.desc()).limit(50).all()
    
    results = []
    for o in orders:
        customer = None
        if o.customer_id:
            customer = db.query(Customer).filter(
                Customer.customer_id == o.customer_id
            ).first()
        
        store = db.query(Store).filter(Store.store_id == o.store_id).first()
        
        results.append({
            "order_id": o.order_id,
            "order_code": o.order_code,
            "order_date": o.order_date.isoformat() if o.order_date else None,
            "customer_name": customer.full_name if customer else "Khách lẻ",
            "store_name": store.store_name if store else "N/A",
            "total_amount": float(o.total_amount or 0),
            "final_amount": float(o.final_amount or 0),
            "status": o.status
        })
    
    return {"orders": results}


# === API: CHI TIẾT ĐƠN HÀNG ===

@router.get("/{order_id}")
def get_order_detail(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    
    details = db.query(OrderDetail).filter(
        OrderDetail.order_id == order_id
    ).all()
    
    items = []
    for d in details:
        drug = db.query(BrandDrug).filter(
            BrandDrug.brand_drug_id == d.brand_drug_id
        ).first()
        
        items.append({
            "brand_name": drug.brand_name if drug else "N/A",
            "drug_code": drug.drug_code if drug else "N/A",
            "strength": drug.strength if drug else "N/A",
            "quantity": d.quantity,
            "unit_price": float(d.unit_price),
            "line_total": float(d.line_total),
            "batch_number": d.batch_number,
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None
        })
    
    return {
        "order_code": order.order_code,
        "order_date": order.order_date.isoformat(),
        "status": order.status,
        "total_amount": float(order.total_amount or 0),
        "items": items
    }