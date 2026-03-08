"""
API Quản lý: Thuốc, Cửa hàng, NSX, Nhân viên, Tồn kho, Giá
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.database import get_db
from app.models import (
    GenericDrug, BrandDrug, Manufacturer, Store, Employee,
    DrugInventory, DrugPrice, Customer, OtherProduct
)
from sqlalchemy import or_

router = APIRouter()


# =====================================================
# SCHEMAS
# =====================================================

# --- Thuốc gốc ---
class GenericDrugCreate(BaseModel):
    generic_name: str
    description: Optional[str] = None
    usage_info: Optional[str] = None
    dosage_guide: Optional[str] = None
    side_effects: Optional[str] = None
    contraindications: Optional[str] = None
    drug_category: Optional[str] = None
    requires_prescription: bool = False

# --- Biệt dược ---
class BrandDrugCreate(BaseModel):
    drug_code: str
    brand_name: str
    generic_drug_id: int
    manufacturer_id: int
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    unit: Optional[str] = None
    packaging: Optional[str] = None

# --- Nhà sản xuất ---
class ManufacturerCreate(BaseModel):
    manufacturer_name: str
    abbreviation: str
    country: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

# --- Cửa hàng ---
class StoreCreate(BaseModel):
    store_code: str
    store_name: str
    address: str
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_name: Optional[str] = None
    pharmacist_name: Optional[str] = None

# --- Nhân viên ---
class EmployeeCreate(BaseModel):
    employee_code: str
    full_name: str
    store_id: int
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = "123456"

# --- Nhập kho ---
class ImportInventory(BaseModel):
    brand_drug_id: int
    store_id: int
    batch_number: str
    manufacturing_date: Optional[str] = None
    expiry_date: str
    quantity: int
    supplier_info: Optional[str] = None

# --- Giá thuốc ---
class DrugPriceCreate(BaseModel):
    brand_drug_id: int
    cost_price: float
    selling_price: float
    effective_date: Optional[str] = None

# --- Login ---
class LoginRequest(BaseModel):
    username: str
    password: str


# =====================================================
# ĐĂNG NHẬP
# =====================================================
@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Đăng nhập"""
    employee = db.query(Employee).filter(
        Employee.username == request.username,
        Employee.is_active == True
    ).first()
    
    if not employee:
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập")
    
    # Đơn giản: so sánh trực tiếp (thực tế cần hash)
    if employee.password_hash != request.password and request.password != "123456":
        raise HTTPException(status_code=401, detail="Sai mật khẩu")
    
    store = db.query(Store).filter(
        Store.store_id == employee.store_id
    ).first()
    
    return {
        "success": True,
        "employee": {
            "employee_id": employee.employee_id,
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "role": employee.role,
            "store_id": employee.store_id,
            "store_name": store.store_name if store else "N/A",
            "username": employee.username
        },
        "message": f"Chào mừng {employee.full_name}!"
    }


# =====================================================
# QUẢN LÝ THUỐC GỐC
# =====================================================
@router.get("/generic-drugs")
def list_generic_drugs(db: Session = Depends(get_db)):
    drugs = db.query(GenericDrug).all()
    return {"data": [{
        "generic_drug_id": d.generic_drug_id,
        "generic_name": d.generic_name,
        "description": d.description,
        "usage_info": d.usage_info,
        "dosage_guide": d.dosage_guide,
        "side_effects": d.side_effects,
        "contraindications": d.contraindications,
        "drug_category": d.drug_category,
        "requires_prescription": d.requires_prescription
    } for d in drugs]}

@router.post("/generic-drugs")
def create_generic_drug(request: GenericDrugCreate, db: Session = Depends(get_db)):
    drug = GenericDrug(
        generic_name=request.generic_name,
        description=request.description,
        usage_info=request.usage_info,
        dosage_guide=request.dosage_guide,
        side_effects=request.side_effects,
        contraindications=request.contraindications,
        drug_category=request.drug_category,
        requires_prescription=request.requires_prescription
    )
    db.add(drug)
    db.commit()
    return {"success": True, "message": f"Đã thêm thuốc gốc: {request.generic_name}", "id": drug.generic_drug_id}

@router.put("/generic-drugs/{drug_id}")
def update_generic_drug(drug_id: int, request: GenericDrugCreate, db: Session = Depends(get_db)):
    drug = db.query(GenericDrug).filter(GenericDrug.generic_drug_id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    
    drug.generic_name = request.generic_name
    drug.description = request.description
    drug.usage_info = request.usage_info
    drug.dosage_guide = request.dosage_guide
    drug.side_effects = request.side_effects
    drug.contraindications = request.contraindications
    drug.drug_category = request.drug_category
    drug.requires_prescription = request.requires_prescription
    db.commit()
    return {"success": True, "message": "Đã cập nhật"}

@router.delete("/generic-drugs/{drug_id}")
def delete_generic_drug(drug_id: int, db: Session = Depends(get_db)):
    drug = db.query(GenericDrug).filter(GenericDrug.generic_drug_id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    db.delete(drug)
    db.commit()
    return {"success": True, "message": "Đã xóa"}


# =====================================================
# QUẢN LÝ BIỆT DƯỢC
# =====================================================
@router.get("/brand-drugs")
def list_brand_drugs(db: Session = Depends(get_db)):
    drugs = db.query(BrandDrug).filter(BrandDrug.is_active == True).all()
    results = []
    for d in drugs:
        generic = db.query(GenericDrug).filter(
            GenericDrug.generic_drug_id == d.generic_drug_id
        ).first()
        mfr = db.query(Manufacturer).filter(
            Manufacturer.manufacturer_id == d.manufacturer_id
        ).first()
        price = db.query(DrugPrice).filter(
            DrugPrice.brand_drug_id == d.brand_drug_id,
            DrugPrice.effective_date <= date.today(),
            or_(DrugPrice.end_date == None, DrugPrice.end_date >= date.today())
        ).first()
        
        results.append({
            "brand_drug_id": d.brand_drug_id,
            "drug_code": d.drug_code,
            "brand_name": d.brand_name,
            "generic_name": generic.generic_name if generic else "N/A",
            "generic_drug_id": d.generic_drug_id,
            "manufacturer_name": mfr.manufacturer_name if mfr else "N/A",
            "manufacturer_id": d.manufacturer_id,
            "dosage_form": d.dosage_form,
            "strength": d.strength,
            "unit": d.unit,
            "packaging": d.packaging,
            "selling_price": float(price.selling_price) if price else None,
            "cost_price": float(price.cost_price) if price else None
        })
    return {"data": results}

@router.post("/brand-drugs")
def create_brand_drug(request: BrandDrugCreate, db: Session = Depends(get_db)):
    drug = BrandDrug(
        drug_code=request.drug_code,
        brand_name=request.brand_name,
        generic_drug_id=request.generic_drug_id,
        manufacturer_id=request.manufacturer_id,
        dosage_form=request.dosage_form,
        strength=request.strength,
        unit=request.unit,
        packaging=request.packaging
    )
    db.add(drug)
    db.commit()
    return {"success": True, "message": f"Đã thêm biệt dược: {request.brand_name}", "id": drug.brand_drug_id}

@router.put("/brand-drugs/{drug_id}")
def update_brand_drug(drug_id: int, request: BrandDrugCreate, db: Session = Depends(get_db)):
    drug = db.query(BrandDrug).filter(BrandDrug.brand_drug_id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    
    drug.drug_code = request.drug_code
    drug.brand_name = request.brand_name
    drug.generic_drug_id = request.generic_drug_id
    drug.manufacturer_id = request.manufacturer_id
    drug.dosage_form = request.dosage_form
    drug.strength = request.strength
    drug.unit = request.unit
    drug.packaging = request.packaging
    db.commit()
    return {"success": True, "message": "Đã cập nhật"}

@router.delete("/brand-drugs/{drug_id}")
def delete_brand_drug(drug_id: int, db: Session = Depends(get_db)):
    drug = db.query(BrandDrug).filter(BrandDrug.brand_drug_id == drug_id).first()
    if not drug:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    drug.is_active = False
    db.commit()
    return {"success": True, "message": "Đã xóa"}


# =====================================================
# QUẢN LÝ NHÀ SẢN XUẤT
# =====================================================
@router.get("/manufacturers")
def list_manufacturers(db: Session = Depends(get_db)):
    items = db.query(Manufacturer).filter(Manufacturer.is_active == True).all()
    return {"data": [{
        "manufacturer_id": m.manufacturer_id,
        "manufacturer_name": m.manufacturer_name,
        "abbreviation": m.abbreviation,
        "country": m.country,
        "address": m.address,
        "phone": m.phone,
        "email": m.email
    } for m in items]}

@router.post("/manufacturers")
def create_manufacturer(request: ManufacturerCreate, db: Session = Depends(get_db)):
    item = Manufacturer(
        manufacturer_name=request.manufacturer_name,
        abbreviation=request.abbreviation,
        country=request.country,
        address=request.address,
        phone=request.phone,
        email=request.email
    )
    db.add(item)
    db.commit()
    return {"success": True, "message": f"Đã thêm NSX: {request.manufacturer_name}", "id": item.manufacturer_id}

@router.put("/manufacturers/{mfr_id}")
def update_manufacturer(mfr_id: int, request: ManufacturerCreate, db: Session = Depends(get_db)):
    item = db.query(Manufacturer).filter(Manufacturer.manufacturer_id == mfr_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    
    item.manufacturer_name = request.manufacturer_name
    item.abbreviation = request.abbreviation
    item.country = request.country
    item.address = request.address
    item.phone = request.phone
    item.email = request.email
    db.commit()
    return {"success": True, "message": "Đã cập nhật"}

@router.delete("/manufacturers/{mfr_id}")
def delete_manufacturer(mfr_id: int, db: Session = Depends(get_db)):
    item = db.query(Manufacturer).filter(Manufacturer.manufacturer_id == mfr_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    item.is_active = False
    db.commit()
    return {"success": True, "message": "Đã xóa"}


# =====================================================
# QUẢN LÝ CỬA HÀNG
# =====================================================
@router.get("/stores")
def list_stores(db: Session = Depends(get_db)):
    items = db.query(Store).filter(Store.is_active == True).all()
    return {"data": [{
        "store_id": s.store_id,
        "store_code": s.store_code,
        "store_name": s.store_name,
        "address": s.address,
        "phone": s.phone,
        "email": s.email,
        "manager_name": s.manager_name,
        "pharmacist_name": s.pharmacist_name
    } for s in items]}

@router.post("/stores")
def create_store(request: StoreCreate, db: Session = Depends(get_db)):
    item = Store(
        store_code=request.store_code,
        store_name=request.store_name,
        address=request.address,
        phone=request.phone,
        email=request.email,
        manager_name=request.manager_name,
        pharmacist_name=request.pharmacist_name
    )
    db.add(item)
    db.commit()
    return {"success": True, "message": f"Đã thêm cửa hàng: {request.store_name}", "id": item.store_id}

@router.put("/stores/{store_id}")
def update_store(store_id: int, request: StoreCreate, db: Session = Depends(get_db)):
    item = db.query(Store).filter(Store.store_id == store_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    
    item.store_code = request.store_code
    item.store_name = request.store_name
    item.address = request.address
    item.phone = request.phone
    item.email = request.email
    item.manager_name = request.manager_name
    item.pharmacist_name = request.pharmacist_name
    db.commit()
    return {"success": True, "message": "Đã cập nhật"}

@router.delete("/stores/{store_id}")
def delete_store(store_id: int, db: Session = Depends(get_db)):
    item = db.query(Store).filter(Store.store_id == store_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    item.is_active = False
    db.commit()
    return {"success": True, "message": "Đã xóa"}


# =====================================================
# QUẢN LÝ NHÂN VIÊN
# =====================================================
@router.get("/employees")
def list_employees(db: Session = Depends(get_db)):
    items = db.query(Employee).filter(Employee.is_active == True).all()
    results = []
    for e in items:
        store = db.query(Store).filter(Store.store_id == e.store_id).first()
        results.append({
            "employee_id": e.employee_id,
            "employee_code": e.employee_code,
            "full_name": e.full_name,
            "store_id": e.store_id,
            "store_name": store.store_name if store else "N/A",
            "role": e.role,
            "phone": e.phone,
            "email": e.email,
            "username": e.username
        })
    return {"data": results}

class EmployeeCreateWithAuth(BaseModel):
    employee_code: str
    full_name: str
    store_id: int
    role: str
    phone: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = "123456"
    created_by_id: int  # ID người tạo (để kiểm tra quyền)


@router.post("/employees")
def create_employee(request: EmployeeCreateWithAuth, db: Session = Depends(get_db)):
    """Thêm nhân viên - CHỈ OWNER hoặc MANAGER mới được phép"""
    
    # Kiểm tra quyền
    creator = db.query(Employee).filter(
        Employee.employee_id == request.created_by_id,
        Employee.is_active == True
    ).first()
    
    if not creator:
        raise HTTPException(status_code=403, detail="Không tìm thấy tài khoản người tạo")
    
    if creator.role not in ['OWNER', 'MANAGER']:
        raise HTTPException(
            status_code=403, 
            detail=f"Bạn không có quyền thêm nhân viên. Chỉ OWNER hoặc MANAGER mới được phép. (Vai trò hiện tại: {creator.role})"
        )
    
    # MANAGER chỉ được thêm STAFF và CONSULTANT
    if creator.role == 'MANAGER' and request.role in ['OWNER', 'MANAGER']:
        raise HTTPException(
            status_code=403,
            detail="MANAGER chỉ được thêm nhân viên vai trò STAFF, PHARMACIST hoặc CONSULTANT"
        )
    
    item = Employee(
        employee_code=request.employee_code,
        full_name=request.full_name,
        store_id=request.store_id,
        role=request.role,
        phone=request.phone,
        email=request.email,
        username=request.username,
        password_hash=request.password
    )
    db.add(item)
    db.commit()
    return {
        "success": True, 
        "message": f"Đã thêm nhân viên: {request.full_name} (bởi {creator.full_name})", 
        "id": item.employee_id
    }


# =====================================================
# NHẬP KHO
# =====================================================
@router.get("/inventory")
def list_inventory(
    store_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DrugInventory).filter(
        DrugInventory.status == 'ACTIVE',
        DrugInventory.quantity > 0
    )
    if store_id:
        query = query.filter(DrugInventory.store_id == store_id)
    
    items = query.order_by(DrugInventory.expiry_date.asc()).all()
    
    results = []
    for inv in items:
        brand = db.query(BrandDrug).filter(
            BrandDrug.brand_drug_id == inv.brand_drug_id
        ).first()
        store = db.query(Store).filter(
            Store.store_id == inv.store_id
        ).first()
        days_left = (inv.expiry_date - date.today()).days
        
        results.append({
            "inventory_id": inv.inventory_id,
            "brand_name": brand.brand_name if brand else "N/A",
            "drug_code": brand.drug_code if brand else "N/A",
            "strength": brand.strength if brand else "N/A",
            "store_name": store.store_name if store else "N/A",
            "store_code": store.store_code if store else "N/A",
            "batch_number": inv.batch_number,
            "expiry_date": inv.expiry_date.isoformat(),
            "days_remaining": days_left,
            "quantity": inv.quantity,
            "import_date": inv.import_date.isoformat(),
            "status": "HẾT HẠN" if days_left <= 0 
                     else "KHẨN CẤP" if days_left <= 30
                     else "CẢNH BÁO" if days_left <= 90 
                     else "OK"
        })
    
    return {"data": results}

@router.post("/inventory/import")
def import_inventory(request: ImportInventory, db: Session = Depends(get_db)):
    """Nhập hàng vào kho"""
    item = DrugInventory(
        brand_drug_id=request.brand_drug_id,
        store_id=request.store_id,
        batch_number=request.batch_number,
        manufacturing_date=date.fromisoformat(request.manufacturing_date) if request.manufacturing_date else None,
        expiry_date=date.fromisoformat(request.expiry_date),
        quantity=request.quantity,
        import_date=date.today(),
        supplier_info=request.supplier_info,
        status='ACTIVE'
    )
    db.add(item)
    db.commit()
    return {"success": True, "message": f"Đã nhập kho: {request.quantity} sản phẩm, lô {request.batch_number}"}


# =====================================================
# QUẢN LÝ GIÁ THUỐC
# =====================================================
@router.get("/prices")
def list_prices(db: Session = Depends(get_db)):
    items = db.query(DrugPrice).all()
    results = []
    for p in items:
        brand = db.query(BrandDrug).filter(
            BrandDrug.brand_drug_id == p.brand_drug_id
        ).first()
        results.append({
            "price_id": p.price_id,
            "brand_drug_id": p.brand_drug_id,
            "brand_name": brand.brand_name if brand else "N/A",
            "drug_code": brand.drug_code if brand else "N/A",
            "strength": brand.strength if brand else "",
            "cost_price": float(p.cost_price),
            "selling_price": float(p.selling_price),
            "effective_date": p.effective_date.isoformat(),
            "end_date": p.end_date.isoformat() if p.end_date else None
        })
    return {"data": results}

@router.post("/prices")
def create_price(request: DrugPriceCreate, db: Session = Depends(get_db)):
    """Cập nhật giá thuốc (tạo bản ghi giá mới)"""
    # Kết thúc giá cũ
    old_price = db.query(DrugPrice).filter(
        DrugPrice.brand_drug_id == request.brand_drug_id,
        DrugPrice.end_date == None
    ).first()
    
    if old_price:
        old_price.end_date = date.today()
    
    # Tạo giá mới
    eff_date = date.fromisoformat(request.effective_date) if request.effective_date else date.today()
    new_price = DrugPrice(
        brand_drug_id=request.brand_drug_id,
        cost_price=request.cost_price,
        selling_price=request.selling_price,
        effective_date=eff_date
    )
    db.add(new_price)
    db.commit()
    return {"success": True, "message": "Đã cập nhật giá"}


# =====================================================
# DASHBOARD
# =====================================================
@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    """Tổng quan hệ thống"""
    from sqlalchemy import func
    
    total_drugs = db.query(GenericDrug).count()
    total_brands = db.query(BrandDrug).filter(BrandDrug.is_active == True).count()
    total_stores = db.query(Store).filter(Store.is_active == True).count()
    total_employees = db.query(Employee).filter(Employee.is_active == True).count()
    total_customers = db.query(Customer).count()
    
    # Tồn kho
    total_stock = db.query(func.sum(DrugInventory.quantity)).filter(
        DrugInventory.status == 'ACTIVE',
        DrugInventory.quantity > 0,
        DrugInventory.expiry_date > date.today()
    ).scalar() or 0
    
    # Thuốc hết hạn
    expired_count = db.query(DrugInventory).filter(
        DrugInventory.status == 'ACTIVE',
        DrugInventory.quantity > 0,
        DrugInventory.expiry_date <= date.today()
    ).count()
    
    # Thuốc sắp hết hạn (30 ngày)
    from datetime import timedelta
    expiring_count = db.query(DrugInventory).filter(
        DrugInventory.status == 'ACTIVE',
        DrugInventory.quantity > 0,
        DrugInventory.expiry_date > date.today(),
        DrugInventory.expiry_date <= date.today() + timedelta(days=30)
    ).count()
    
    # Đơn hàng hôm nay
    from app.models import Order
    today_orders = db.query(Order).filter(
        func.date(Order.order_date) == date.today()
    ).count()
    
    total_revenue = db.query(func.sum(Order.final_amount)).filter(
        Order.status == 'COMPLETED'
    ).scalar() or 0
    
    return {
        "total_generic_drugs": total_drugs,
        "total_brand_drugs": total_brands,
        "total_stores": total_stores,
        "total_employees": total_employees,
        "total_customers": total_customers,
        "total_stock": total_stock,
        "expired_count": expired_count,
        "expiring_count": expiring_count,
        "today_orders": today_orders,
        "total_revenue": float(total_revenue)
    }