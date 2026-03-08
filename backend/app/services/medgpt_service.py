"""
MedGPT Service - MỘT CHAT LÀM TẤT CẢ
Tự phát hiện ý định người dùng và thực hiện hành động phù hợp
"""

import re
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import date, datetime, timedelta
from app.config import settings
from app.models import (
    GenericDrug, BrandDrug, DrugInventory, DrugPrice,
    Manufacturer, Store, Order, OrderDetail, Customer,
    GenericDrugSubstitution, SubstitutionGroup
)
from app.utils.drug_code_generator import generate_drug_code
from app.utils.fefo_handler import allocate_stock, deduct_stock

# ================================
# CẤU HÌNH GEMINI
# ================================
genai.configure(api_key=settings.GEMINI_API_KEY)

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash-lite",
    system_instruction="""
Bạn là MedGPT - Trợ lý AI thông minh cho hệ thống quản lý chuỗi nhà thuốc.

KHẢ NĂNG CỦA BẠN:
1. Tư vấn thuốc: công dụng, cách dùng, liều dùng, tác dụng phụ, chống chỉ định
2. Tra cứu tồn kho: số lượng thuốc tại từng cửa hàng
3. Tìm thuốc thay thế: các thuốc cùng công dụng có thể thay thế
4. Báo cáo thuốc sắp hết hạn: cần thanh lý
5. Đề xuất mã thuốc: theo quy tắc [NHÓM]-[HOẠT CHẤT]-[DẠNG]-[HÀM LƯỢNG]-[NSX]-[STT]
6. Hỗ trợ tạo đơn hàng
7. Giới thiệu thuốc và hướng dẫn sử dụng

QUY TẮC:
- Trả lời bằng tiếng Việt
- Thân thiện, chuyên nghiệp
- Luôn khuyên tham khảo bác sĩ/dược sĩ khi tư vấn thuốc kê đơn
- Khi tra cứu tồn kho, nhắc nhở về hạn sử dụng
- Khi có dữ liệu từ hệ thống, trình bày rõ ràng dạng bảng
- Nếu không tìm thấy thuốc trong hệ thống, vẫn tư vấn dựa trên kiến thức y dược
"""
)


# ================================
# ĐỊNH NGHĨA CÁC Ý ĐỊNH (INTENT)
# ================================
INTENTS = {
    "inventory": {
        "keywords": [
            'tồn kho', 'còn hàng', 'số lượng', 'bao nhiêu', 
            'có không', 'còn không', 'kiểm tra kho', 'check kho',
            'hàng còn', 'còn bao', 'stock', 'inventory'
        ],
        "description": "Tra cứu tồn kho"
    },
    "substitute": {
        "keywords": [
            'thay thế', 'thay the', 'tương đương', 'tương tự',
            'cùng công dụng', 'thay bằng', 'dùng gì thay',
            'thuốc khác', 'loại khác', 'substitute'
        ],
        "description": "Tìm thuốc thay thế"
    },
    "expiry": {
        "keywords": [
            'hết hạn', 'het han', 'thanh lý', 'thanh ly', 
            'sắp hết hạn', 'expired', 'hạn sử dụng',
            'cần thanh lý', 'quá hạn', 'date'
        ],
        "description": "Báo cáo thuốc hết hạn"
    },
    "drug_code": {
        "keywords": [
            'mã thuốc', 'đánh mã', 'tạo mã', 'sinh mã',
            'đề xuất mã', 'drug code', 'code thuốc',
            'quy tắc mã', 'mã sản phẩm'
        ],
        "description": "Đề xuất mã thuốc"
    },
    "create_order": {
        "keywords": [
            'tạo đơn', 'đặt hàng', 'mua thuốc', 'lên đơn',
            'order', 'đơn hàng mới', 'bán cho', 'xuất bán'
        ],
        "description": "Tạo đơn hàng"
    },
    "drug_info": {
        "keywords": [
            'công dụng', 'cách dùng', 'tác dụng phụ', 'chống chỉ định',
            'liều dùng', 'hướng dẫn', 'thông tin thuốc', 'thuốc gì',
            'dùng để', 'chữa gì', 'trị gì', 'uống thế nào',
            'là thuốc gì', 'giới thiệu'
        ],
        "description": "Thông tin thuốc"
    },
    "store_info": {
        "keywords": [
            'cửa hàng', 'chi nhánh', 'danh sách cửa hàng',
            'store', 'nhà thuốc nào', 'địa chỉ'
        ],
        "description": "Thông tin cửa hàng"
    }
}


class MedGPTService:
    """Service xử lý mọi yêu cầu qua 1 chat duy nhất"""
    
    def __init__(self):
        self.chat_sessions = {}
    
    # ================================
    # HÀM CHÍNH: CHAT (Entry Point duy nhất)
    # ================================
    def chat(self, db, user_message, session_id="default"):
        """
        Xử lý mọi tin nhắn từ người dùng:
        1. Phát hiện ý định
        2. Trích xuất thông tin (tên thuốc, cửa hàng, số lượng...)
        3. Tra cứu DB
        4. Gửi kết quả cho Gemini để tạo câu trả lời tự nhiên
        """
        
        try:
            # Bước 1: Phát hiện ý định
            intent = self._detect_intent(user_message)
            
            # Bước 2: Trích xuất thông tin từ câu hỏi
            drug_name = self._extract_drug_name(db, user_message)
            store_id = self._extract_store_id(db, user_message)
            quantity = self._extract_quantity(user_message)
            
            # Bước 3: Thực hiện hành động theo ý định
            db_context = ""
            action_result = None
            
            if intent == "inventory":
                db_context = self._handle_inventory(db, drug_name, store_id)
                
            elif intent == "substitute":
                db_context = self._handle_substitute(db, drug_name)
                
            elif intent == "expiry":
                db_context = self._handle_expiry(db, store_id)
                
            elif intent == "drug_code":
                db_context = self._handle_drug_code(db, user_message, drug_name)
                
            elif intent == "create_order":
                db_context, action_result = self._handle_create_order(
                    db, drug_name, store_id, quantity
                )
                
            elif intent == "drug_info":
                db_context = self._handle_drug_info(db, drug_name)
                
            elif intent == "store_info":
                db_context = self._handle_store_info(db)
                
            else:
                # Không rõ ý định → tìm thông tin chung
                db_context = self._handle_general(db, user_message, drug_name)
            
            # Bước 4: Gửi cho Gemini tạo câu trả lời tự nhiên
            enhanced_message = f"""
Câu hỏi của người dùng: {user_message}

Ý định phát hiện: {intent}
Thuốc liên quan: {drug_name if drug_name else 'Không xác định'}
Cửa hàng: {store_id if store_id else 'Tất cả'}

DỮ LIỆU TỪ HỆ THỐNG:
{db_context if db_context else 'Không có dữ liệu liên quan trong hệ thống.'}

Hãy trả lời câu hỏi dựa trên dữ liệu trên. 
- Trình bày rõ ràng, dễ đọc
- Nếu có danh sách, dùng bullet points
- Nếu có số liệu, trình bày dạng bảng
- Nhắc nhở về hạn sử dụng nếu liên quan
"""
            
            # Gọi Gemini
            if session_id not in self.chat_sessions:
                self.chat_sessions[session_id] = model.start_chat(history=[])
            
            chat = self.chat_sessions[session_id]
            response = chat.send_message(enhanced_message)
            
            result = {
                "success": True,
                "response": response.text,
                "intent": intent,
                "drug_found": drug_name
            }
            
            # Nếu có action (VD: tạo đơn hàng)
            if action_result:
                result["action_result"] = action_result
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "response": f"Xin lỗi, MedGPT gặp sự cố: {str(e)}. Vui lòng thử lại!",
                "intent": "error"
            }
    
    # ================================
    # PHÁT HIỆN Ý ĐỊNH
    # ================================
    def _detect_intent(self, message):
        """Phát hiện người dùng muốn làm gì"""
        msg = message.lower()
        
        # Đếm keyword match cho từng intent
        scores = {}
        for intent, data in INTENTS.items():
            score = sum(1 for kw in data["keywords"] if kw in msg)
            if score > 0:
                scores[intent] = score
        
        if scores:
            # Trả về intent có nhiều keyword match nhất
            return max(scores, key=scores.get)
        
        return "general"
    
    # ================================
    # TRÍCH XUẤT TÊN THUỐC
    # ================================
    def _extract_drug_name(self, db, message):
        """Tìm tên thuốc trong câu hỏi"""
        msg = message.lower()
        
        # Tìm trong danh sách thuốc gốc
        generics = db.query(GenericDrug).all()
        for drug in generics:
            if drug.generic_name.lower() in msg:
                return drug.generic_name
        
        # Tìm trong danh sách biệt dược
        brands = db.query(BrandDrug).all()
        for brand in brands:
            if brand.brand_name.lower() in msg:
                return brand.brand_name
        
        return None
    
    # ================================
    # TRÍCH XUẤT CỬA HÀNG
    # ================================
    def _extract_store_id(self, db, message):
        """Tìm cửa hàng trong câu hỏi"""
        msg = message.lower()
        
        stores = db.query(Store).all()
        for store in stores:
            if store.store_code.lower() in msg:
                return store.store_id
            if store.store_name.lower() in msg:
                return store.store_id
        
        # Tìm pattern "cửa hàng 1", "chi nhánh 2"
        match = re.search(r'(?:cửa hàng|chi nhánh|ch)\s*(\d+)', msg)
        if match:
            store_num = int(match.group(1))
            store = db.query(Store).filter(
                Store.store_code == f"CH{store_num:03d}"
            ).first()
            if store:
                return store.store_id
        
        return None
    
    # ================================
    # TRÍCH XUẤT SỐ LƯỢNG
    # ================================
    def _extract_quantity(self, message):
        """Tìm số lượng trong câu hỏi"""
        match = re.search(r'(\d+)\s*(?:viên|hộp|chai|gói|ống|cái|vỉ)', message.lower())
        if match:
            return int(match.group(1))
        
        match = re.search(r'(?:số lượng|sl|mua|bán|xuất)\s*(\d+)', message.lower())
        if match:
            return int(match.group(1))
        
        return None
    
    # ================================
    # XỬ LÝ: TRA CỨU TỒN KHO
    # ================================
    def _handle_inventory(self, db, drug_name, store_id=None):
        """Tra cứu tồn kho"""
        
        if not drug_name:
            # Không biết thuốc nào → trả về tổng quan
            all_inventory = db.query(DrugInventory).filter(
                and_(
                    DrugInventory.status == 'ACTIVE',
                    DrugInventory.quantity > 0,
                    DrugInventory.expiry_date > date.today()
                )
            ).all()
            
            summary = {}
            for inv in all_inventory:
                brand = db.query(BrandDrug).filter(
                    BrandDrug.brand_drug_id == inv.brand_drug_id
                ).first()
                store = db.query(Store).filter(
                    Store.store_id == inv.store_id
                ).first()
                
                key = f"{brand.brand_name} {brand.strength}" if brand else "N/A"
                if key not in summary:
                    summary[key] = {"total": 0, "stores": []}
                summary[key]["total"] += inv.quantity
                summary[key]["stores"].append(
                    f"{store.store_name}: {inv.quantity} (HSD: {inv.expiry_date})"
                )
            
            info = "TỔNG QUAN TỒN KHO:\n\n"
            for drug, data in summary.items():
                info += f"📦 {drug} - Tổng: {data['total']}\n"
                for s in data["stores"]:
                    info += f"   • {s}\n"
                info += "\n"
            
            return info
        
        # Có tên thuốc → tra cứu chi tiết
        brands = db.query(BrandDrug).filter(
            or_(
                BrandDrug.brand_name.ilike(f"%{drug_name}%"),
                BrandDrug.drug_code.ilike(f"%{drug_name}%")
            )
        ).all()
        
        if not brands:
            generic = db.query(GenericDrug).filter(
                GenericDrug.generic_name.ilike(f"%{drug_name}%")
            ).first()
            if generic:
                brands = db.query(BrandDrug).filter(
                    BrandDrug.generic_drug_id == generic.generic_drug_id
                ).all()
        
        if not brands:
            return f"Không tìm thấy thuốc '{drug_name}' trong hệ thống."
        
        info = f"TỒN KHO THUỐC: {drug_name}\n\n"
        
        for brand in brands:
            query = db.query(DrugInventory).filter(
                and_(
                    DrugInventory.brand_drug_id == brand.brand_drug_id,
                    DrugInventory.status == 'ACTIVE',
                    DrugInventory.quantity > 0
                )
            )
            if store_id:
                query = query.filter(DrugInventory.store_id == store_id)
            
            inventories = query.order_by(DrugInventory.expiry_date.asc()).all()
            
            price = db.query(DrugPrice).filter(
                and_(
                    DrugPrice.brand_drug_id == brand.brand_drug_id,
                    DrugPrice.effective_date <= date.today(),
                    or_(DrugPrice.end_date == None, DrugPrice.end_date >= date.today())
                )
            ).first()
            
            total_qty = sum(inv.quantity for inv in inventories)
            
            info += f"📦 {brand.brand_name} {brand.strength} ({brand.dosage_form})\n"
            info += f"   Mã thuốc: {brand.drug_code}\n"
            info += f"   Giá bán: {float(price.selling_price):,.0f}đ\n" if price else ""
            info += f"   Tổng tồn: {total_qty}\n"
            
            for inv in inventories:
                store = db.query(Store).filter(Store.store_id == inv.store_id).first()
                days_left = (inv.expiry_date - date.today()).days
                
                if days_left <= 0:
                    status = "🔴 HẾT HẠN"
                elif days_left <= 30:
                    status = "🟡 KHẨN CẤP"
                elif days_left <= 90:
                    status = "🟠 CẢNH BÁO"
                else:
                    status = "🟢 OK"
                
                info += f"   • {store.store_name if store else 'N/A'}: "
                info += f"{inv.quantity} | Lô: {inv.batch_number} | "
                info += f"HSD: {inv.expiry_date} | Còn {days_left} ngày | {status}\n"
            
            info += "\n"
        
        return info
    
    # ================================
    # XỬ LÝ: TÌM THUỐC THAY THẾ
    # ================================
    def _handle_substitute(self, db, drug_name):
        """Tìm thuốc thay thế"""
        
        if not drug_name:
            return "Vui lòng cho biết tên thuốc cần tìm thay thế. VD: 'Tìm thuốc thay thế cho Paracetamol'"
        
        # Tìm thuốc gốc
        generic = db.query(GenericDrug).filter(
            or_(
                GenericDrug.generic_name.ilike(f"%{drug_name}%"),
            )
        ).first()
        
        if not generic:
            brand = db.query(BrandDrug).filter(
                BrandDrug.brand_name.ilike(f"%{drug_name}%")
            ).first()
            if brand:
                generic = db.query(GenericDrug).filter(
                    GenericDrug.generic_drug_id == brand.generic_drug_id
                ).first()
        
        if not generic:
            return f"Không tìm thấy thuốc '{drug_name}' trong hệ thống."
        
        info = f"THUỐC GỐC: {generic.generic_name}\n"
        info += f"Công dụng: {generic.usage_info}\n\n"
        
        # Tìm nhóm thay thế
        sub_links = db.query(GenericDrugSubstitution).filter(
            GenericDrugSubstitution.generic_drug_id == generic.generic_drug_id
        ).all()
        
        if not sub_links:
            info += "Không tìm thấy thuốc thay thế trong hệ thống."
            return info
        
        info += "CÁC THUỐC THAY THẾ:\n\n"
        
        for link in sub_links:
            group = db.query(SubstitutionGroup).filter(
                SubstitutionGroup.group_id == link.group_id
            ).first()
            
            same_group = db.query(GenericDrugSubstitution).filter(
                and_(
                    GenericDrugSubstitution.group_id == link.group_id,
                    GenericDrugSubstitution.generic_drug_id != generic.generic_drug_id
                )
            ).all()
            
            if group:
                info += f"📋 Nhóm: {group.group_name}\n"
            
            for sg in same_group:
                sub_drug = db.query(GenericDrug).filter(
                    GenericDrug.generic_drug_id == sg.generic_drug_id
                ).first()
                
                if sub_drug:
                    info += f"\n🔄 {sub_drug.generic_name} (Ưu tiên: {sg.priority})\n"
                    info += f"   Công dụng: {sub_drug.usage_info}\n"
                    
                    brands = db.query(BrandDrug).filter(
                        BrandDrug.generic_drug_id == sub_drug.generic_drug_id,
                        BrandDrug.is_active == True
                    ).all()
                    
                    for b in brands:
                        mfr = db.query(Manufacturer).filter(
                            Manufacturer.manufacturer_id == b.manufacturer_id
                        ).first()
                        info += f"   • {b.brand_name} {b.strength} - "
                        info += f"NSX: {mfr.manufacturer_name if mfr else 'N/A'} "
                        info += f"({mfr.country if mfr else ''})\n"
        
        return info
    
    # ================================
    # XỬ LÝ: BÁO CÁO HẾT HẠN / THANH LÝ
    # ================================
    def _handle_expiry(self, db, store_id=None, days=90):
        """Báo cáo thuốc cần thanh lý"""
        
        threshold = date.today() + timedelta(days=days)
        
        query = db.query(DrugInventory).filter(
            and_(
                DrugInventory.status == 'ACTIVE',
                DrugInventory.quantity > 0,
                DrugInventory.expiry_date <= threshold
            )
        )
        
        if store_id:
            query = query.filter(DrugInventory.store_id == store_id)
        
        inventories = query.order_by(DrugInventory.expiry_date.asc()).all()
        
        expired = []
        critical = []
        warning = []
        
        for inv in inventories:
            brand = db.query(BrandDrug).filter(
                BrandDrug.brand_drug_id == inv.brand_drug_id
            ).first()
            store = db.query(Store).filter(
                Store.store_id == inv.store_id
            ).first()
            price = db.query(DrugPrice).filter(
                DrugPrice.brand_drug_id == inv.brand_drug_id
            ).first()
            
            days_left = (inv.expiry_date - date.today()).days
            cost = float(price.cost_price) * inv.quantity if price else 0
            
            item = {
                "name": f"{brand.brand_name} {brand.strength}" if brand else "N/A",
                "store": store.store_name if store else "N/A",
                "batch": inv.batch_number,
                "expiry": inv.expiry_date.isoformat(),
                "days": days_left,
                "qty": inv.quantity,
                "cost": cost
            }
            
            if days_left <= 0:
                expired.append(item)
            elif days_left <= 30:
                critical.append(item)
            else:
                warning.append(item)
        
        total_loss = sum(i["cost"] for i in expired + critical)
        
        info = "BÁO CÁO THUỐC CẦN THANH LÝ\n\n"
        info += f"📊 TỔNG KẾT:\n"
        info += f"   • Đã hết hạn: {len(expired)} lô\n"
        info += f"   • Khẩn cấp (< 30 ngày): {len(critical)} lô\n"
        info += f"   • Cảnh báo (< 90 ngày): {len(warning)} lô\n"
        info += f"   • Thiệt hại ước tính: {total_loss:,.0f}đ\n\n"
        
        if expired:
            info += "🔴 ĐÃ HẾT HẠN (CẦN THANH LÝ NGAY):\n"
            for i in expired:
                info += f"   • {i['name']} | {i['store']} | Lô: {i['batch']}"
                info += f" | HSD: {i['expiry']} | SL: {i['qty']}"
                info += f" | Thiệt hại: {i['cost']:,.0f}đ\n"
            info += "\n"
        
        if critical:
            info += "🟡 KHẨN CẤP (< 30 NGÀY):\n"
            for i in critical:
                info += f"   • {i['name']} | {i['store']} | Lô: {i['batch']}"
                info += f" | Còn {i['days']} ngày | SL: {i['qty']}\n"
            info += "\n"
        
        if warning:
            info += "🟠 CẢNH BÁO (< 90 NGÀY):\n"
            for i in warning:
                info += f"   • {i['name']} | {i['store']} | Lô: {i['batch']}"
                info += f" | Còn {i['days']} ngày | SL: {i['qty']}\n"
        
        if not expired and not critical and not warning:
            info += "✅ Không có thuốc nào cần thanh lý!"
        
        return info
    
    # ================================
    # XỬ LÝ: ĐỀ XUẤT MÃ THUỐC
    # ================================
    def _handle_drug_code(self, db, message, drug_name=None):
        """Đề xuất mã thuốc"""
        
        if drug_name:
            # Tìm thông tin thuốc để sinh mã
            brand = db.query(BrandDrug).filter(
                BrandDrug.brand_name.ilike(f"%{drug_name}%")
            ).first()
            
            if brand:
                return f"""
MÃ THUỐC HIỆN TẠI:
• {brand.brand_name} {brand.strength}: {brand.drug_code}

GIẢI THÍCH MÃ: {brand.drug_code}
{self._explain_drug_code(brand.drug_code)}
"""
            
            generic = db.query(GenericDrug).filter(
                GenericDrug.generic_name.ilike(f"%{drug_name}%")
            ).first()
            
            if generic:
                brands = db.query(BrandDrug).filter(
                    BrandDrug.generic_drug_id == generic.generic_drug_id
                ).all()
                
                info = f"CÁC MÃ THUỐC CỦA {generic.generic_name}:\n\n"
                for b in brands:
                    info += f"• {b.brand_name} {b.strength}: {b.drug_code}\n"
                    info += f"  {self._explain_drug_code(b.drug_code)}\n\n"
                
                return info
        
        # Giải thích quy tắc đánh mã chung
        info = """
QUY TẮC ĐÁNH MÃ THUỐC:
Format: [NHÓM]-[HOẠT CHẤT]-[DẠNG]-[HÀM LƯỢNG]-[NSX]-[STT]

NHÓM THUỐC:
  ANP = Giảm đau/Hạ sốt    ANT = Kháng sinh
  GIT = Tiêu hóa            CVD = Tim mạch
  ALG = Dị ứng              DIA = Tiểu đường
  RES = Hô hấp              VIT = Vitamin
  DER = Da liễu             NER = Thần kinh

DẠNG BÀO CHẾ:
  TAB = Viên nén    CAP = Viên nang    EFF = Viên sủi
  SYR = Siro        PWD = Bột pha      INJ = Tiêm
  CRM = Kem         GEL = Gel          EYE = Nhỏ mắt

VÍ DỤ:
  ANP-PAR-TAB-500MG-GSK-001 = Giảm đau - Paracetamol - Viên nén - 500mg - GSK - 001
"""
        return info
    
    def _explain_drug_code(self, code):
        """Giải thích từng phần của mã thuốc"""
        parts = code.split('-')
        if len(parts) != 6:
            return "Mã không đúng format"
        
        cat_names = {
            'ANP': 'Giảm đau/Hạ sốt', 'ANT': 'Kháng sinh',
            'GIT': 'Tiêu hóa', 'CVD': 'Tim mạch',
            'ALG': 'Dị ứng', 'DIA': 'Tiểu đường',
            'RES': 'Hô hấp', 'VIT': 'Vitamin',
            'DER': 'Da liễu', 'NER': 'Thần kinh'
        }
        form_names = {
            'TAB': 'Viên nén', 'CAP': 'Viên nang', 'EFF': 'Viên sủi',
            'SYR': 'Siro', 'PWD': 'Bột pha', 'INJ': 'Tiêm',
            'CRM': 'Kem', 'GEL': 'Gel', 'EYE': 'Nhỏ mắt'
        }
        
        return (
            f"  [{parts[0]}] {cat_names.get(parts[0], 'Khác')} - "
            f"[{parts[1]}] Hoạt chất - "
            f"[{parts[2]}] {form_names.get(parts[2], 'Khác')} - "
            f"[{parts[3]}] Hàm lượng - "
            f"[{parts[4]}] NSX - "
            f"[{parts[5]}] STT"
        )
    
    # ================================
    # XỬ LÝ: TẠO ĐƠN HÀNG
    # ================================
    def _handle_create_order(self, db, drug_name, store_id, quantity):
        """Tạo đơn hàng qua chat"""
        
        if not drug_name:
            return "Vui lòng cho biết tên thuốc. VD: 'Tạo đơn 20 viên Panadol tại cửa hàng 1'", None
        
        if not store_id:
            return "Vui lòng cho biết cửa hàng. VD: 'Tạo đơn 20 viên Panadol tại CH001'", None
        
        if not quantity:
            return "Vui lòng cho biết số lượng. VD: 'Tạo đơn 20 viên Panadol tại CH001'", None
        
        # Tìm biệt dược
        brand = db.query(BrandDrug).filter(
            BrandDrug.brand_name.ilike(f"%{drug_name}%")
        ).first()
        
        if not brand:
            generic = db.query(GenericDrug).filter(
                GenericDrug.generic_name.ilike(f"%{drug_name}%")
            ).first()
            if generic:
                brand = db.query(BrandDrug).filter(
                    BrandDrug.generic_drug_id == generic.generic_drug_id
                ).first()
        
        if not brand:
            return f"Không tìm thấy thuốc '{drug_name}'", None
        
        # Kiểm tra tồn kho FEFO
        allocations = allocate_stock(db, brand.brand_drug_id, store_id, quantity)
        
        if not allocations:
            return f"Không đủ hàng {brand.brand_name} tại cửa hàng (cần {quantity})", None
        
        # Lấy giá
        price = db.query(DrugPrice).filter(
            and_(
                DrugPrice.brand_drug_id == brand.brand_drug_id,
                DrugPrice.effective_date <= date.today(),
                or_(DrugPrice.end_date == None, DrugPrice.end_date >= date.today())
            )
        ).first()
        
        if not price:
            return f"Chưa có giá cho thuốc {brand.brand_name}", None
        
        # Tạo đơn hàng
        order_code = f"DH-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        order = Order(
            order_code=order_code,
            store_id=store_id,
            employee_id=1,
            order_type='DIRECT',
            status='PENDING'
        )
        db.add(order)
        db.flush()
        
        total = 0
        
        for alloc in allocations:
            line_total = float(price.selling_price) * alloc['quantity']
            total += line_total
            
            detail = OrderDetail(
                order_id=order.order_id,
                item_type='DRUG',
                brand_drug_id=brand.brand_drug_id,
                inventory_id=alloc['inventory_id'],
                quantity=alloc['quantity'],
                unit_price=float(price.selling_price),
                line_total=line_total,
                batch_number=alloc['batch_number'],
                expiry_date=alloc['expiry_date']
            )
            db.add(detail)
        
        deduct_stock(db, allocations)
        
        order.total_amount = total
        order.final_amount = total
        order.status = 'COMPLETED'
        db.commit()
        
        store = db.query(Store).filter(Store.store_id == store_id).first()
        
        info = f"""
✅ ĐÃ TẠO ĐƠN HÀNG THÀNH CÔNG!

📋 Mã đơn: {order_code}
🏪 Cửa hàng: {store.store_name if store else 'N/A'}
💊 Thuốc: {brand.brand_name} {brand.strength}
📦 Số lượng: {quantity}
💰 Đơn giá: {float(price.selling_price):,.0f}đ
💵 Tổng tiền: {total:,.0f}đ

CHI TIẾT XUẤT KHO (FEFO):
"""
        for alloc in allocations:
            days_left = (alloc['expiry_date'] - date.today()).days
            info += f"  • Lô {alloc['batch_number']}: {alloc['quantity']} viên"
            info += f" (HSD: {alloc['expiry_date']}, còn {days_left} ngày)\n"
        
        action_result = {
            "type": "order_created",
            "order_code": order_code,
            "total": total
        }
        
        return info, action_result
    
    # ================================
    # XỬ LÝ: THÔNG TIN THUỐC
    # ================================
    def _handle_drug_info(self, db, drug_name):
        """Tra cứu thông tin thuốc"""
        
        if not drug_name:
            return "Vui lòng cho biết tên thuốc. VD: 'Paracetamol công dụng gì?'"
        
        generic = db.query(GenericDrug).filter(
            GenericDrug.generic_name.ilike(f"%{drug_name}%")
        ).first()
        
        if not generic:
            brand = db.query(BrandDrug).filter(
                BrandDrug.brand_name.ilike(f"%{drug_name}%")
            ).first()
            if brand:
                generic = db.query(GenericDrug).filter(
                    GenericDrug.generic_drug_id == brand.generic_drug_id
                ).first()
        
        if not generic:
            return f"Không tìm thấy '{drug_name}' trong hệ thống. Sẽ tư vấn dựa trên kiến thức y dược."
        
        info = f"""
💊 THÔNG TIN THUỐC: {generic.generic_name}

📝 Mô tả: {generic.description}

✅ Công dụng: {generic.usage_info}

📏 Liều dùng: {generic.dosage_guide}

⚠️ Tác dụng phụ: {generic.side_effects}

🚫 Chống chỉ định: {generic.contraindications}

📂 Nhóm thuốc: {generic.drug_category}
🏷️ Cần kê đơn: {'Có' if generic.requires_prescription else 'Không'}
"""
        
        brands = db.query(BrandDrug).filter(
            BrandDrug.generic_drug_id == generic.generic_drug_id,
            BrandDrug.is_active == True
        ).all()
        
        if brands:
            info += "\n📦 CÁC BIỆT DƯỢC HIỆN CÓ:\n"
            for b in brands:
                mfr = db.query(Manufacturer).filter(
                    Manufacturer.manufacturer_id == b.manufacturer_id
                ).first()
                price = db.query(DrugPrice).filter(
                    and_(
                        DrugPrice.brand_drug_id == b.brand_drug_id,
                        DrugPrice.effective_date <= date.today(),
                        or_(DrugPrice.end_date == None, DrugPrice.end_date >= date.today())
                    )
                ).first()
                
                info += f"  • {b.brand_name} {b.strength} ({b.dosage_form})"
                info += f" - NSX: {mfr.manufacturer_name if mfr else 'N/A'}"
                info += f" ({mfr.country if mfr else ''})"
                if price:
                    info += f" - Giá: {float(price.selling_price):,.0f}đ"
                info += f"\n    Mã: {b.drug_code} | Đóng gói: {b.packaging}\n"
        
        return info
    
    # ================================
    # XỬ LÝ: THÔNG TIN CỬA HÀNG
    # ================================
    def _handle_store_info(self, db):
        """Thông tin các cửa hàng"""
        
        stores = db.query(Store).filter(Store.is_active == True).all()
        
        info = "🏪 DANH SÁCH CỬA HÀNG TRONG CHUỖI:\n\n"
        for s in stores:
            info += f"  📍 {s.store_code} - {s.store_name}\n"
            info += f"     Địa chỉ: {s.address}\n"
            info += f"     SĐT: {s.phone or 'N/A'}\n\n"
        
        return info
    
    # ================================
    # XỬ LÝ: CÂU HỎI CHUNG
    # ================================
    def _handle_general(self, db, message, drug_name=None):
        """Xử lý câu hỏi chung"""
        
        context = ""
        
        if drug_name:
            context = self._handle_drug_info(db, drug_name)
        
        return context


# Tạo instance dùng chung
medgpt_service = MedGPTService()