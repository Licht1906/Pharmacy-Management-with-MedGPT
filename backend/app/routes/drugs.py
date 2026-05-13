"""API Tra cứu thuốc"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services.medgpt_service import medgpt_service
from app.models import GenericDrug, BrandDrug, Manufacturer, DrugInventory, DrugPrice
from sqlalchemy import or_, and_, func
from datetime import date
from app.dependencies import get_current_user, CurrentUser

router = APIRouter()


@router.get("/search")
def search_drugs(
    name: str = Query(..., description="Tên thuốc cần tìm"),
    store_id: Optional[int] = Query(None, description="ID cửa hàng để lọc tồn kho"),
    db: Session = Depends(get_db),
    current_user: Optional[CurrentUser] = Depends(get_current_user)
):
    """Tra cứu thông tin thuốc và tồn kho (JSON format)"""
    brands = db.query(BrandDrug).filter(
        or_(
            BrandDrug.brand_name.ilike(f"%{name}%"),
            BrandDrug.drug_code.ilike(f"%{name}%")
        )
    ).all()

    if not brands:
        generic = db.query(GenericDrug).filter(
            GenericDrug.generic_name.ilike(f"%{name}%")
        ).first()
        if generic:
            brands = db.query(BrandDrug).filter(
                BrandDrug.generic_drug_id == generic.generic_drug_id
            ).all()

    if not brands:
        return {"found": False, "results": []}

    results = []
    for brand in brands:
        # Lấy tổng tồn kho
        inventory_filters = [
            DrugInventory.brand_drug_id == brand.brand_drug_id,
            DrugInventory.status == 'ACTIVE',
            DrugInventory.expiry_date > date.today()
        ]
        if current_user and current_user.role != 'OWNER':
            inventory_filters.append(DrugInventory.store_id == current_user.store_id)
        elif store_id:
            inventory_filters.append(DrugInventory.store_id == store_id)

        total_qty = db.query(func.sum(DrugInventory.quantity)).filter(
            and_(*inventory_filters)
        ).scalar() or 0
        
        # Lấy giá bán
        price = db.query(DrugPrice).filter(
            and_(
                DrugPrice.brand_drug_id == brand.brand_drug_id,
                DrugPrice.effective_date <= date.today(),
                or_(DrugPrice.end_date == None, DrugPrice.end_date >= date.today())
            )
        ).first()

        results.append({
            "brand_drug_id": brand.brand_drug_id,
            "drug_code": brand.drug_code,
            "brand_name": brand.brand_name,
            "strength": brand.strength,
            "price": float(price.selling_price) if price else 0,
            "total_quantity": int(total_qty)
        })
    
    return {"found": True, "results": results}


@router.get("/substitutes")
def find_substitutes(
    name: str = Query(..., description="Tên thuốc cần tìm thay thế"),
    db: Session = Depends(get_db)
):
    """Tìm thuốc thay thế cùng công dụng"""
    return medgpt_service._handle_substitute_json(db, name)


@router.get("/info")
def get_drug_info(
    name: str = Query(..., description="Tên thuốc"),
    db: Session = Depends(get_db)
):
    """Lấy thông tin chi tiết thuốc"""
    
    generic = db.query(GenericDrug).filter(
        or_(
            GenericDrug.generic_name.ilike(f"%{name}%"),
            GenericDrug.description.ilike(f"%{name}%")
        )
    ).first()
    
    if not generic:
        brand = db.query(BrandDrug).filter(
            BrandDrug.brand_name.ilike(f"%{name}%")
        ).first()
        if brand:
            generic = db.query(GenericDrug).filter(
                GenericDrug.generic_drug_id == brand.generic_drug_id
            ).first()
    
    if not generic:
        return {"found": False, "message": f"Không tìm thấy '{name}'"}
    
    brands = db.query(BrandDrug).filter(
        BrandDrug.generic_drug_id == generic.generic_drug_id
    ).all()
    
    brand_list = []
    for b in brands:
        mfr = db.query(Manufacturer).filter(
            Manufacturer.manufacturer_id == b.manufacturer_id
        ).first()
        brand_list.append({
            "drug_code": b.drug_code,
            "brand_name": b.brand_name,
            "strength": b.strength,
            "dosage_form": b.dosage_form,
            "packaging": b.packaging,
            "manufacturer": mfr.manufacturer_name if mfr else "N/A",
            "country": mfr.country if mfr else "N/A"
        })
    
    return {
        "found": True,
        "generic_name": generic.generic_name,
        "description": generic.description,
        "usage": generic.usage_info,
        "dosage_guide": generic.dosage_guide,
        "side_effects": generic.side_effects,
        "contraindications": generic.contraindications,
        "category": generic.drug_category,
        "requires_prescription": generic.requires_prescription,
        "brands": brand_list
    }