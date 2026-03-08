"""API Tra cứu thuốc"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services.medgpt_service import medgpt_service
from app.models import GenericDrug, BrandDrug, Manufacturer
from sqlalchemy import or_

router = APIRouter()


@router.get("/search")
def search_drugs(
    name: str = Query(..., description="Tên thuốc cần tìm"),
    db: Session = Depends(get_db)
):
    """Tra cứu thông tin thuốc và tồn kho"""
    return medgpt_service.check_inventory(db, name)


@router.get("/substitutes")
def find_substitutes(
    name: str = Query(..., description="Tên thuốc cần tìm thay thế"),
    db: Session = Depends(get_db)
):
    """Tìm thuốc thay thế cùng công dụng"""
    return medgpt_service.find_substitutes(db, name)


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