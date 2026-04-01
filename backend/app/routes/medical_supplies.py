"""
API Quản lý vật dụng y tế (Medical Supplies)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from app.database import get_db
from app.models import OtherProduct, ProductInventory, Manufacturer, Store
from sqlalchemy import or_

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

class OtherProductCreate(BaseModel):
    product_code: str
    product_name: str
    category: Optional[str] = None
    manufacturer_id: int
    unit: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None

class OtherProductUpdate(BaseModel):
    product_name: Optional[str] = None
    category: Optional[str] = None
    manufacturer_id: Optional[int] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    is_active: Optional[bool] = None


# =====================================================
# QUẢN LÝ SẢN PHẨM Y TẾ
# =====================================================

@router.get("/products")
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    manufacturer_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Liệt kê sản phẩm y tế"""
    query = db.query(OtherProduct)
    
    if search:
        query = query.filter(
            or_(
                OtherProduct.product_name.ilike(f"%{search}%"),
                OtherProduct.product_code.ilike(f"%{search}%"),
                OtherProduct.description.ilike(f"%{search}%")
            )
        )
    
    if category:
        query = query.filter(OtherProduct.category == category)
    
    if manufacturer_id:
        query = query.filter(OtherProduct.manufacturer_id == manufacturer_id)
    
    items = query.all()
    results = []
    for p in items:
        manufacturer = db.query(Manufacturer).filter(
            Manufacturer.manufacturer_id == p.manufacturer_id
        ).first()
        results.append({
            "product_id": p.product_id,
            "product_code": p.product_code,
            "product_name": p.product_name,
            "category": p.category,
            "manufacturer_id": p.manufacturer_id,
            "manufacturer_name": manufacturer.manufacturer_name if manufacturer else "N/A",
            "unit": p.unit,
            "description": p.description,
            "barcode": p.barcode,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    
    return results


@router.post("/products")
def create_product(request: OtherProductCreate, db: Session = Depends(get_db)):
    """Tạo sản phẩm y tế mới"""
    # Kiểm tra mã sản phẩm đã tồn tại
    existing = db.query(OtherProduct).filter(
        OtherProduct.product_code == request.product_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã sản phẩm đã tồn tại")
    
    item = OtherProduct(
        product_code=request.product_code,
        product_name=request.product_name,
        category=request.category,
        manufacturer_id=request.manufacturer_id,
        unit=request.unit,
        description=request.description,
        barcode=request.barcode
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"success": True, "product_id": item.product_id}


@router.put("/products/{product_id}")
def update_product(product_id: int, request: OtherProductUpdate, db: Session = Depends(get_db)):
    """Cập nhật sản phẩm y tế"""
    item = db.query(OtherProduct).filter(OtherProduct.product_id == product_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    
    for field, value in request.dict(exclude_unset=True).items():
        setattr(item, field, value)
    
    db.commit()
    return {"success": True}


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Xóa sản phẩm y tế (đánh dấu không hoạt động)"""
    item = db.query(OtherProduct).filter(OtherProduct.product_id == product_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
    
    item.is_active = False
    db.commit()
    return {"success": True}


# =====================================================
# QUẢN LÝ TỒN KHO SẢN PHẨM Y TẾ
# =====================================================

@router.get("/inventory")
def get_product_inventory(
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Lấy tồn kho sản phẩm y tế"""
    query = db.query(ProductInventory)
    
    if store_id:
        query = query.filter(ProductInventory.store_id == store_id)
    
    if product_id:
        query = query.filter(ProductInventory.product_id == product_id)
    
    items = query.all()
    results = []
    for inv in items:
        product = db.query(OtherProduct).filter(
            OtherProduct.product_id == inv.product_id
        ).first()
        store = db.query(Store).filter(
            Store.store_id == inv.store_id
        ).first()
        
        # Tính trạng thái dựa trên expiry_date
        today = date.today()
        if inv.expiry_date < today:
            status = 'HẾT HẠN'
        elif (inv.expiry_date - today).days <= 30:
            status = 'CẢNH BÁO'
        elif (inv.expiry_date - today).days <= 7:
            status = 'KHẨN CẤP'
        else:
            status = 'OK'
        
        results.append({
            "inventory_id": inv.inventory_id,
            "product_id": inv.product_id,
            "product_name": product.product_name if product else "N/A",
            "product_code": product.product_code if product else "N/A",
            "category": product.category if product else "N/A",
            "store_id": inv.store_id,
            "store_name": store.store_name if store else "N/A",
            "batch_number": inv.batch_number,
            "manufacturing_date": inv.manufacturing_date.isoformat() if inv.manufacturing_date else None,
            "expiry_date": inv.expiry_date.isoformat(),
            "quantity": inv.quantity,
            "import_date": inv.import_date.isoformat(),
            "supplier_info": inv.supplier_info,
            "status": status,
            "inventory_status": inv.status
        })
    
    return results


@router.get("/categories")
def get_product_categories(db: Session = Depends(get_db)):
    """Lấy danh sách danh mục sản phẩm y tế"""
    categories = db.query(OtherProduct.category).filter(
        OtherProduct.category.isnot(None),
        OtherProduct.is_active == True
    ).distinct().all()
    
    return [cat[0] for cat in categories if cat[0]]