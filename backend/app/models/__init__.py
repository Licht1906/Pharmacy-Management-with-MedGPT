"""
Tất cả Models (ánh xạ bảng Database sang Python)
"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, 
    DateTime, ForeignKey, Numeric, Date
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


# ============================
# BẢNG: NHÀ SẢN XUẤT
# ============================
class Manufacturer(Base):
    __tablename__ = "manufacturers"
    
    manufacturer_id = Column(Integer, primary_key=True)
    manufacturer_name = Column(String(255), nullable=False)
    abbreviation = Column(String(10))
    country = Column(String(100))
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Quan hệ: 1 NSX → nhiều biệt dược
    brand_drugs = relationship("BrandDrug", back_populates="manufacturer")
    other_products = relationship("OtherProduct", back_populates="manufacturer")


# ============================
# BẢNG: THUỐC GỐC
# VD: Paracetamol, Amoxicillin
# ============================
class GenericDrug(Base):
    __tablename__ = "generic_drugs"
    
    generic_drug_id = Column(Integer, primary_key=True)
    generic_name = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    usage_info = Column(Text)
    dosage_guide = Column(Text)
    side_effects = Column(Text)
    contraindications = Column(Text)
    drug_category = Column(String(100))
    requires_prescription = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Quan hệ: 1 thuốc gốc → nhiều biệt dược
    brand_drugs = relationship("BrandDrug", back_populates="generic_drug")
    # Quan hệ: thuốc gốc ↔ nhóm thay thế
    substitution_links = relationship("GenericDrugSubstitution", back_populates="generic_drug")


# ============================
# BẢNG: NHÓM THAY THẾ
# VD: Nhóm giảm đau hạ sốt
# ============================
class SubstitutionGroup(Base):
    __tablename__ = "substitution_groups"
    
    group_id = Column(Integer, primary_key=True)
    group_name = Column(String(255), nullable=False)
    description = Column(Text)
    therapeutic_class = Column(String(200))
    
    drug_links = relationship("GenericDrugSubstitution", back_populates="group")


class GenericDrugSubstitution(Base):
    __tablename__ = "generic_drug_substitutions"
    
    id = Column(Integer, primary_key=True)
    generic_drug_id = Column(Integer, ForeignKey("generic_drugs.generic_drug_id"))
    group_id = Column(Integer, ForeignKey("substitution_groups.group_id"))
    priority = Column(Integer, default=1)
    notes = Column(Text)
    
    generic_drug = relationship("GenericDrug", back_populates="substitution_links")
    group = relationship("SubstitutionGroup", back_populates="drug_links")


# ============================
# BẢNG: BIỆT DƯỢC
# VD: Panadol 500mg, Efferalgan 500mg
# ============================
class BrandDrug(Base):
    __tablename__ = "brand_drugs"
    
    brand_drug_id = Column(Integer, primary_key=True)
    drug_code = Column(String(50), nullable=False, unique=True)
    brand_name = Column(String(255), nullable=False)
    generic_drug_id = Column(Integer, ForeignKey("generic_drugs.generic_drug_id"))
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.manufacturer_id"))
    dosage_form = Column(String(100))
    strength = Column(String(100))
    unit = Column(String(50))
    packaging = Column(String(200))
    registration_number = Column(String(100))
    barcode = Column(String(50))
    image_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    generic_drug = relationship("GenericDrug", back_populates="brand_drugs")
    manufacturer = relationship("Manufacturer", back_populates="brand_drugs")
    prices = relationship("DrugPrice", back_populates="brand_drug")
    inventory_items = relationship("DrugInventory", back_populates="brand_drug")


# ============================
# BẢNG: GIÁ THUỐC
# ============================
class DrugPrice(Base):
    __tablename__ = "drug_prices"
    
    price_id = Column(Integer, primary_key=True)
    brand_drug_id = Column(Integer, ForeignKey("brand_drugs.brand_drug_id"))
    cost_price = Column(Numeric(15, 2), nullable=False)
    selling_price = Column(Numeric(15, 2), nullable=False)
    effective_date = Column(Date, nullable=False)
    end_date = Column(Date)
    approved_by = Column(Integer)
    inventory_check_id = Column(Integer)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    brand_drug = relationship("BrandDrug", back_populates="prices")


# ============================
# BẢNG: CỬA HÀNG
# ============================
class Store(Base):
    __tablename__ = "stores"
    
    store_id = Column(Integer, primary_key=True)
    store_code = Column(String(20), nullable=False, unique=True)
    store_name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    phone = Column(String(20))
    email = Column(String(100))
    manager_name = Column(String(200))
    pharmacist_name = Column(String(200))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    drug_inventories = relationship("DrugInventory", back_populates="store")
    product_inventories = relationship("ProductInventory", back_populates="store")


# ============================
# BẢNG: NHÂN VIÊN
# ============================
class Employee(Base):
    __tablename__ = "employees"
    
    employee_id = Column(Integer, primary_key=True)
    employee_code = Column(String(20), nullable=False, unique=True)
    full_name = Column(String(200), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    role = Column(String(50), nullable=False)
    phone = Column(String(20))
    email = Column(String(100))
    username = Column(String(100), unique=True)
    password_hash = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================
# BẢNG: TỒN KHO THUỐC (QUAN TRỌNG NHẤT)
# Quản lý theo LÔ → theo dõi hạn sử dụng
# ============================
class DrugInventory(Base):
    __tablename__ = "drug_inventory"
    
    inventory_id = Column(Integer, primary_key=True)
    brand_drug_id = Column(Integer, ForeignKey("brand_drugs.brand_drug_id"))
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    batch_number = Column(String(100), nullable=False)
    manufacturing_date = Column(Date)
    expiry_date = Column(Date, nullable=False)      # HẠN SỬ DỤNG
    quantity = Column(Integer, nullable=False, default=0)
    import_date = Column(Date, nullable=False)
    supplier_info = Column(Text)
    status = Column(String(20), default='ACTIVE')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    brand_drug = relationship("BrandDrug", back_populates="inventory_items")
    store = relationship("Store", back_populates="drug_inventories")


# ============================
# BẢNG: TỒN KHO SẢN PHẨM Y TẾ
# ============================
class ProductInventory(Base):
    __tablename__ = "product_inventory"
    
    inventory_id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("other_products.product_id"))
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    batch_number = Column(String(100), nullable=False)
    manufacturing_date = Column(Date)
    expiry_date = Column(Date, nullable=False)      # HẠN SỬ DỤNG
    quantity = Column(Integer, nullable=False, default=0)
    import_date = Column(Date, nullable=False)
    supplier_info = Column(Text)
    status = Column(String(20), default='ACTIVE')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("OtherProduct", back_populates="inventory_items")
    store = relationship("Store", back_populates="product_inventories")


# ============================
# BẢNG: KHÁCH HÀNG
# ============================
class Customer(Base):
    __tablename__ = "customers"
    
    customer_id = Column(Integer, primary_key=True)
    full_name = Column(String(200))
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    allergy_info = Column(Text)
    medical_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    orders = relationship("Order", back_populates="customer")


# ============================
# BẢNG: ĐƠN HÀNG
# ============================
class Order(Base):
    __tablename__ = "orders"
    
    order_id = Column(Integer, primary_key=True)
    order_code = Column(String(30), nullable=False, unique=True)
    order_date = Column(DateTime, default=datetime.utcnow)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"))
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    source_store_id = Column(Integer, ForeignKey("stores.store_id"))
    employee_id = Column(Integer, ForeignKey("employees.employee_id"))
    order_type = Column(String(20), default='DIRECT')
    status = Column(String(20), default='PENDING')
    total_amount = Column(Numeric(15, 2), default=0)
    discount_amount = Column(Numeric(15, 2), default=0)
    final_amount = Column(Numeric(15, 2), default=0)
    payment_method = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="orders")
    details = relationship("OrderDetail", back_populates="order", cascade="all, delete-orphan")


# ============================
# BẢNG: CHI TIẾT ĐƠN HÀNG
# ============================
class OrderDetail(Base):
    __tablename__ = "order_details"
    
    detail_id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"))
    item_type = Column(String(10), nullable=False)
    brand_drug_id = Column(Integer, ForeignKey("brand_drugs.brand_drug_id"))
    product_id = Column(Integer)
    inventory_id = Column(Integer)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=False)
    discount = Column(Numeric(15, 2), default=0)
    line_total = Column(Numeric(15, 2), nullable=False)
    batch_number = Column(String(100))
    expiry_date = Column(Date)
    notes = Column(Text)
    
    order = relationship("Order", back_populates="details")


# ============================
# BẢNG: THANH LÝ
# ============================
class Disposal(Base):
    __tablename__ = "disposals"
    
    disposal_id = Column(Integer, primary_key=True)
    disposal_code = Column(String(30), nullable=False, unique=True)
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    disposal_date = Column(DateTime)
    created_by = Column(Integer, ForeignKey("employees.employee_id"))
    approved_by = Column(Integer, ForeignKey("employees.employee_id"))
    status = Column(String(20), default='PENDING')
    reason = Column(Text)
    total_value = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    details = relationship("DisposalDetail", back_populates="disposal", cascade="all, delete-orphan")


class DisposalDetail(Base):
    __tablename__ = "disposal_details"
    
    detail_id = Column(Integer, primary_key=True)
    disposal_id = Column(Integer, ForeignKey("disposals.disposal_id", ondelete="CASCADE"))
    inventory_id = Column(Integer, nullable=False)
    brand_drug_id = Column(Integer)
    batch_number = Column(String(100))
    expiry_date = Column(Date)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(15, 2))
    total_cost = Column(Numeric(15, 2))
    notes = Column(Text)
    
    disposal = relationship("Disposal", back_populates="details")


# ============================
# BẢNG: SẢN PHẨM KHÁC
# VD: Bơm tiêm, khẩu trang, găng tay
# ============================
class OtherProduct(Base):
    __tablename__ = "other_products"
    
    product_id = Column(Integer, primary_key=True)
    product_code = Column(String(50), nullable=False, unique=True)
    product_name = Column(String(255), nullable=False)
    category = Column(String(100))
    manufacturer_id = Column(Integer, ForeignKey("manufacturers.manufacturer_id"))
    unit = Column(String(50))
    description = Column(Text)
    barcode = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Quan hệ: 1 sản phẩm → nhiều lô tồn kho
    inventory_items = relationship("ProductInventory", back_populates="product")
    manufacturer = relationship("Manufacturer", back_populates="other_products")


# ============================
# BẢNG: LOG MedGPT
# ============================
class MedGPTConversation(Base):
    __tablename__ = "medgpt_conversations"
    
    conversation_id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"))
    session_id = Column(String(100))
    query_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    query_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)