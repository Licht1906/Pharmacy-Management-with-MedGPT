"""
Sinh mã thuốc tự động
Format: [NHÓM]-[HOẠT CHẤT]-[DẠNG]-[HÀM LƯỢNG]-[NSX]-[STT]
VD:     ANP   -PAR        -TAB  -500MG       -DHG -001
"""

CATEGORY_CODES = {
    'kháng sinh': 'ANT',
    'giảm đau': 'ANP',
    'hạ sốt': 'ANP',
    'giảm đau hạ sốt': 'ANP',
    'tim mạch': 'CVD',
    'tiểu đường': 'DIA',
    'tiêu hóa': 'GIT',
    'hô hấp': 'RES',
    'da liễu': 'DER',
    'vitamin': 'VIT',
    'dị ứng': 'ALG',
    'thần kinh': 'NER',
    'khác': 'OTH'
}

DOSAGE_FORM_CODES = {
    'viên nén': 'TAB',
    'viên nang': 'CAP',
    'viên sủi': 'EFF',
    'siro': 'SYR',
    'tiêm': 'INJ',
    'kem': 'CRM',
    'bột pha': 'PWD',
    'gel': 'GEL',
    'dung dịch': 'SOL',
    'nhỏ mắt': 'EYE',
    'khác': 'OTH'
}


def generate_drug_code(category, generic_name, dosage_form, 
                       strength, manufacturer_abbr, sequence_number):
    """
    Ví dụ: generate_drug_code('giảm đau', 'Paracetamol', 'viên nén', '500mg', 'DHG', 1)
    → 'ANP-PAR-TAB-500MG-DHG-001'
    """
    cat_code = CATEGORY_CODES.get(category.lower(), 'OTH')
    generic_code = generic_name[:3].upper()
    form_code = DOSAGE_FORM_CODES.get(dosage_form.lower(), 'OTH')
    strength_code = strength.upper().replace(' ', '')
    mfr_code = manufacturer_abbr[:3].upper()
    seq_code = f"{sequence_number:03d}"
    
    return f"{cat_code}-{generic_code}-{form_code}-{strength_code}-{mfr_code}-{seq_code}"