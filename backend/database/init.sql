DROP TABLE IF EXISTS medgpt_conversations CASCADE;
DROP TABLE IF EXISTS drug_code_suggestions CASCADE;
DROP TABLE IF EXISTS disposal_details CASCADE;
DROP TABLE IF EXISTS disposals CASCADE;
DROP TABLE IF EXISTS order_details CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS inventory_check_details CASCADE;
DROP TABLE IF EXISTS inventory_checks CASCADE;
DROP TABLE IF EXISTS product_inventory CASCADE;
DROP TABLE IF EXISTS drug_inventory CASCADE;
DROP TABLE IF EXISTS product_prices CASCADE;
DROP TABLE IF EXISTS drug_prices CASCADE;
DROP TABLE IF EXISTS other_products CASCADE;
DROP TABLE IF EXISTS brand_drugs CASCADE;
DROP TABLE IF EXISTS generic_drug_substitutions CASCADE;
DROP TABLE IF EXISTS substitution_groups CASCADE;
DROP TABLE IF EXISTS generic_drugs CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS manufacturers CASCADE;

CREATE TABLE manufacturers (
    manufacturer_id     SERIAL PRIMARY KEY,
    manufacturer_name   VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL DEFAULT '',  -- Tên viết tắt để tạo mã thuốc
    country             VARCHAR(100),
    address             TEXT,
    phone               VARCHAR(20),
    email               VARCHAR(100),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE manufacturers IS 'Nhà sản xuất thuốc và sản phẩm y tế';
COMMENT ON COLUMN manufacturers.country IS 'Nước SX - ảnh hưởng đến giá thuốc';
COMMENT ON COLUMN manufacturers.abbreviation IS 'Tên viết tắt NSX - dùng trong mã thuốc (VD: DHG, PYM, GSK)';

CREATE TABLE generic_drugs (
    generic_drug_id     SERIAL PRIMARY KEY,
    generic_name        VARCHAR(255) NOT NULL UNIQUE,
    description         TEXT,
    usage_info          TEXT,              -- Công dụng
    dosage_guide        TEXT,              -- Hướng dẫn liều dùng
    side_effects        TEXT,              -- Tác dụng phụ
    contraindications   TEXT,              -- Chống chỉ định
    drug_category       VARCHAR(100),      -- Nhóm: kháng sinh, giảm đau...
    requires_prescription BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE generic_drugs IS 'Thuốc gốc - cùng hoạt chất, cùng công dụng';

CREATE TABLE substitution_groups (
    group_id            SERIAL PRIMARY KEY,
    group_name          VARCHAR(255) NOT NULL,
    description         TEXT,
    therapeutic_class   VARCHAR(200)
);

COMMENT ON TABLE substitution_groups IS 'Nhóm thuốc thay thế - cùng công dụng trị liệu';

CREATE TABLE generic_drug_substitutions (
    id                  SERIAL PRIMARY KEY,
    generic_drug_id     INT REFERENCES generic_drugs(generic_drug_id) ON DELETE CASCADE,
    group_id            INT REFERENCES substitution_groups(group_id) ON DELETE CASCADE,
    priority            INT DEFAULT 1,     -- 1=ưu tiên cao nhất
    notes               TEXT,
    UNIQUE(generic_drug_id, group_id)
);

--brand drugs - biệt dược - tên thương mại, có thể trùng tên nhưng khác hàm lượng
CREATE TABLE brand_drugs (
    brand_drug_id       SERIAL PRIMARY KEY,
    drug_code           VARCHAR(50) NOT NULL UNIQUE,  -- MÃ THUỐC
    brand_name          VARCHAR(255) NOT NULL,
    generic_drug_id     INT REFERENCES generic_drugs(generic_drug_id),
    manufacturer_id     INT REFERENCES manufacturers(manufacturer_id),
    dosage_form         VARCHAR(100),      -- Dạng: viên nén, siro, tiêm...
    strength            VARCHAR(100),      -- Hàm lượng: 500mg, 250mg/5ml
    unit                VARCHAR(50),       -- Đơn vị: viên, chai, ống
    packaging           VARCHAR(200),      -- Đóng gói: Hộp 10 vỉ x 10 viên
    registration_number VARCHAR(100),      -- Số đăng ký
    barcode             VARCHAR(50),
    image_url           VARCHAR(500),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE brand_drugs IS 'Biệt dược - tên thương mại, có thể trùng tên nhưng khác hàm lượng';
COMMENT ON COLUMN brand_drugs.drug_code IS 'Mã thuốc theo quy tắc: NHÓM-GỐC-DẠNG-HÀMLƯỢNG-NSX-STT';
COMMENT ON COLUMN brand_drugs.strength IS 'Hàm lượng - cùng biệt dược có thể khác hàm lượng';

CREATE TABLE other_products (
    product_id          SERIAL PRIMARY KEY,
    product_code        VARCHAR(50) NOT NULL UNIQUE,
    product_name        VARCHAR(255) NOT NULL,
    category            VARCHAR(100),
    manufacturer_id     INT REFERENCES manufacturers(manufacturer_id),
    unit                VARCHAR(50),
    description         TEXT,
    barcode             VARCHAR(50),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stores (
    store_id            SERIAL PRIMARY KEY,
    store_code          VARCHAR(20) NOT NULL UNIQUE,
    store_name          VARCHAR(255) NOT NULL,
    address             TEXT NOT NULL,
    phone               VARCHAR(20),
    email               VARCHAR(100),
    manager_name        VARCHAR(200),
    pharmacist_name     VARCHAR(200),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
    employee_id         SERIAL PRIMARY KEY,
    employee_code       VARCHAR(20) NOT NULL UNIQUE,
    full_name           VARCHAR(200) NOT NULL,
    store_id            INT REFERENCES stores(store_id),
    role                VARCHAR(50) NOT NULL,
    phone               VARCHAR(20),
    email               VARCHAR(100),
    username            VARCHAR(100) UNIQUE,
    password_hash       VARCHAR(255),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drug_prices (
    price_id            SERIAL PRIMARY KEY,
    brand_drug_id       INT REFERENCES brand_drugs(brand_drug_id),
    cost_price          DECIMAL(15,2) NOT NULL,     -- Giá nhập
    selling_price       DECIMAL(15,2) NOT NULL,     -- Giá bán
    effective_date      DATE NOT NULL,               -- Ngày áp dụng
    end_date            DATE,                        -- Ngày kết thúc
    approved_by         INT REFERENCES employees(employee_id),
    inventory_check_id  INT,                         -- Đợt kiểm kê liên quan
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN drug_prices.inventory_check_id IS 'Phải kiểm kê trước khi thay đổi giá';

CREATE TABLE drug_inventory (
    inventory_id        SERIAL PRIMARY KEY,
    brand_drug_id       INT REFERENCES brand_drugs(brand_drug_id),
    store_id            INT REFERENCES stores(store_id),
    batch_number        VARCHAR(100) NOT NULL,       -- Số lô
    manufacturing_date  DATE,
    expiry_date         DATE NOT NULL,               -- *** HẠN SỬ DỤNG ***
    quantity            INT NOT NULL DEFAULT 0,
    import_date         DATE NOT NULL,
    supplier_info       TEXT,
    status              VARCHAR(20) DEFAULT 'ACTIVE',
    -- ACTIVE: đang bán, EXPIRED: hết hạn, DISPOSED: đã thanh lý
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_expiry ON drug_inventory(expiry_date ASC);
CREATE INDEX idx_inventory_store_drug ON drug_inventory(store_id, brand_drug_id);

COMMENT ON TABLE drug_inventory IS 'Tồn kho theo lô - FEFO: hết hạn trước bán trước';

CREATE TABLE customers (
    customer_id         SERIAL PRIMARY KEY,
    full_name           VARCHAR(200),
    phone               VARCHAR(20),
    email               VARCHAR(100),
    address             TEXT,
    allergy_info        TEXT,              -- Dị ứng
    medical_notes       TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    order_id            SERIAL PRIMARY KEY,
    order_code          VARCHAR(30) NOT NULL UNIQUE,
    order_date          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_id         INT REFERENCES customers(customer_id),
    store_id            INT REFERENCES stores(store_id),
    source_store_id     INT REFERENCES stores(store_id),   -- Cửa hàng gốc nếu chuyển
    employee_id         INT REFERENCES employees(employee_id),
    order_type          VARCHAR(20) DEFAULT 'DIRECT',
    -- DIRECT: mua tại chỗ, ONLINE: đặt online, TRANSFER: chuyển từ CH khác
    status              VARCHAR(20) DEFAULT 'PENDING',
    total_amount        DECIMAL(15,2) DEFAULT 0,
    discount_amount     DECIMAL(15,2) DEFAULT 0,
    final_amount        DECIMAL(15,2) DEFAULT 0,
    payment_method      VARCHAR(50),
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_details (
    detail_id           SERIAL PRIMARY KEY,
    order_id            INT REFERENCES orders(order_id) ON DELETE CASCADE,
    item_type           VARCHAR(10) NOT NULL,  -- 'DRUG' hoặc 'PRODUCT'
    brand_drug_id       INT REFERENCES brand_drugs(brand_drug_id),
    product_id          INT REFERENCES other_products(product_id),
    inventory_id        INT,                    -- Lô xuất (FEFO)
    quantity            INT NOT NULL,
    unit_price          DECIMAL(15,2) NOT NULL,
    discount            DECIMAL(15,2) DEFAULT 0,
    line_total          DECIMAL(15,2) NOT NULL,
    batch_number        VARCHAR(100),           -- Số lô xuất
    expiry_date         DATE,                   -- HSD lô xuất
    notes               TEXT
);

CREATE TABLE disposals (
    disposal_id         SERIAL PRIMARY KEY,
    disposal_code       VARCHAR(30) NOT NULL UNIQUE,
    store_id            INT REFERENCES stores(store_id),
    disposal_date       TIMESTAMP,
    created_by          INT REFERENCES employees(employee_id),
    approved_by         INT REFERENCES employees(employee_id),
    status              VARCHAR(20) DEFAULT 'PENDING',
    reason              TEXT,
    total_value         DECIMAL(15,2) DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disposal_details (
    detail_id           SERIAL PRIMARY KEY,
    disposal_id         INT REFERENCES disposals(disposal_id) ON DELETE CASCADE,
    inventory_id        INT NOT NULL,
    brand_drug_id       INT,
    batch_number        VARCHAR(100),
    expiry_date         DATE,
    quantity            INT NOT NULL,
    unit_cost           DECIMAL(15,2),
    total_cost          DECIMAL(15,2),
    notes               TEXT
);

CREATE TABLE medgpt_conversations (
    conversation_id     SERIAL PRIMARY KEY,
    employee_id         INT REFERENCES employees(employee_id),
    session_id          VARCHAR(100),
    query_text          TEXT NOT NULL,
    response_text       TEXT NOT NULL,
    query_type          VARCHAR(50),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- DỮ LIỆU MẪU
-- =====================================================

-- Nhà sản xuất
INSERT INTO manufacturers (manufacturer_name, abbreviation, country, address, phone, email) VALUES
('DHG Pharma',              'DHG',  'Việt Nam',  '288 Bis Nguyễn Văn Cừ, Cần Thơ',          '0292-3891-433', 'info@dhgpharma.com.vn'),
('Pymepharco',              'PYM',  'Việt Nam',  '166 Nguyễn Huệ, Phú Yên',                  '0257-3822-853', 'info@pymepharco.com.vn'),
('Sanofi',                  'SNF',  'Pháp',      '10 Hamburg, Paris, France',                  NULL,            'contact@sanofi.com'),
('GlaxoSmithKline (GSK)',   'GSK',  'Anh',       '980 Great West Road, London, UK',           NULL,            'contact@gsk.com'),
('Pfizer',                  'PFZ',  'Mỹ',        '235 East 42nd St, New York, USA',           NULL,            'contact@pfizer.com'),
('Abbott',                  'ABT',  'Mỹ',        '100 Abbott Park Road, Illinois, USA',       NULL,            'contact@abbott.com'),
('Stellapharm',             'STL',  'Việt Nam',  'Lô 27 KCN Việt Nam-Singapore, Bình Dương',  '0274-3742-742', 'info@stellapharm.com'),
('Traphaco',                'TRP',  'Việt Nam',  '75 Yên Ninh, Ba Đình, Hà Nội',             '024-3716-2626', 'info@traphaco.com.vn'),
('Imexpharm',               'IMX',  'Việt Nam',  '04 Đường 30/4, Cao Lãnh, Đồng Tháp',      '0277-3851-535', 'info@imexpharm.com'),
('Hậu Giang Pharma',       'HGP',  'Việt Nam',  'KCN Tân Phú Thạnh, Hậu Giang',             '0293-3961-970', 'info@hgpharma.com.vn');

-- Cửa hàng
INSERT INTO stores (store_code, store_name, address, phone) VALUES
('CH001', 'Nhà thuốc Trung tâm', '123 Nguyễn Huệ, Q.1, TP.HCM', '0281-2345-678'),
('CH002', 'Nhà thuốc Bình Thạnh', '456 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM', '0282-3456-789'),
('CH003', 'Nhà thuốc Gò Vấp', '789 Quang Trung, Q.Gò Vấp, TP.HCM', '0283-4567-890');

-- Nhân viên
INSERT INTO employees (employee_code, full_name, store_id, role, username, password_hash) VALUES
('NV001', 'Nguyễn Văn An', 1, 'OWNER', 'admin', '\$2b$12$LJ3mFGEyrPMJqDVxWtMkOeYK.'),
('NV002', 'Trần Thị Bình', 1, 'PHARMACIST', 'binh_tt', '\$2b$12$hash2'),
('NV003', 'Lê Văn Cường', 2, 'MANAGER', 'cuong_lv', '\$2b$12$hash3'),
('NV004', 'Phạm Thị Dung', 3, 'STAFF', 'dung_pt', '\$2b$12$hash4');

-- Thuốc gốc
INSERT INTO generic_drugs (generic_name, description, usage_info, dosage_guide, side_effects, contraindications, drug_category, requires_prescription) VALUES
('Paracetamol', 
 'Thuốc giảm đau, hạ sốt thông dụng',
 'Giảm đau nhẹ đến vừa (đau đầu, đau răng, đau cơ), hạ sốt',
 'Người lớn: 500mg-1000mg mỗi 4-6 giờ, tối đa 4g/ngày. Trẻ em: 10-15mg/kg mỗi 4-6 giờ',
 'Hiếm gặp: phát ban, buồn nôn. Quá liều: tổn thương gan nghiêm trọng',
 'Suy gan nặng, quá mẫn với paracetamol',
 'Giảm đau hạ sốt', FALSE),

('Amoxicillin',
 'Kháng sinh nhóm Penicillin phổ rộng', 
 'Nhiễm khuẩn đường hô hấp, tiết niệu, da và mô mềm',
 'Người lớn: 250-500mg mỗi 8 giờ. Trẻ em: 20-40mg/kg/ngày chia 3 lần',
 'Tiêu chảy, buồn nôn, phát ban, dị ứng',
 'Dị ứng Penicillin, tăng bạch cầu đơn nhân nhiễm khuẩn',
 'Kháng sinh', TRUE),

('Omeprazole',
 'Thuốc ức chế bơm proton (PPI)',
 'Loét dạ dày tá tràng, trào ngược dạ dày thực quản (GERD)',
 'Người lớn: 20-40mg/ngày, uống trước ăn sáng 30 phút',
 'Đau đầu, tiêu chảy, buồn nôn, đau bụng',
 'Quá mẫn với omeprazole hoặc PPI khác',
 'Tiêu hóa', FALSE),

('Cetirizine',
 'Thuốc kháng histamin H1 thế hệ 2',
 'Viêm mũi dị ứng, mày đay, dị ứng da',
 'Người lớn và trẻ >12 tuổi: 10mg/ngày. Trẻ 6-12: 5mg x 2 lần/ngày',
 'Buồn ngủ nhẹ, khô miệng, đau đầu',
 'Suy thận nặng, trẻ < 2 tuổi',
 'Dị ứng', FALSE),

('Ibuprofen',
 'Thuốc kháng viêm không steroid (NSAID)',
 'Giảm đau, hạ sốt, kháng viêm (viêm khớp, đau cơ, đau bụng kinh)',
 'Người lớn: 200-400mg mỗi 4-6 giờ, tối đa 1200mg/ngày',
 'Đau dạ dày, buồn nôn, chóng mặt, phù',
 'Loét dạ dày tiến triển, suy thận nặng, 3 tháng cuối thai kỳ',
 'Giảm đau hạ sốt', FALSE);

-- Nhóm thay thế (Paracetamol và Ibuprofen cùng nhóm giảm đau hạ sốt)
INSERT INTO substitution_groups (group_name, description, therapeutic_class) VALUES
('Nhóm giảm đau hạ sốt', 'Các thuốc có tác dụng giảm đau và/hoặc hạ sốt', 'Giảm đau - Hạ sốt'),
('Nhóm kháng sinh Penicillin', 'Kháng sinh nhóm Beta-lactam', 'Kháng sinh'),
('Nhóm ức chế bơm proton', 'Thuốc giảm tiết acid dạ dày', 'Tiêu hóa'),
('Nhóm kháng Histamin', 'Thuốc chống dị ứng', 'Dị ứng');

INSERT INTO generic_drug_substitutions (generic_drug_id, group_id, priority) VALUES
(1, 1, 1),  -- Paracetamol → Nhóm giảm đau (ưu tiên 1)
(5, 1, 2),  -- Ibuprofen → Nhóm giảm đau (ưu tiên 2)
(2, 2, 1),  -- Amoxicillin → Nhóm kháng sinh
(3, 3, 1),  -- Omeprazole → Nhóm PPI
(4, 4, 1);  -- Cetirizine → Nhóm kháng Histamin

-- Biệt dược (Brand Drugs)
INSERT INTO brand_drugs (drug_code, brand_name, generic_drug_id, manufacturer_id, dosage_form, strength, unit, packaging) VALUES
-- Paracetamol brands
('ANP-PAR-TAB-500MG-DHG-001', 'Panadol', 1, 4, 'Viên nén', '500mg', 'Viên', 'Hộp 12 vỉ x 10 viên'),
('ANP-PAR-TAB-500MG-DHG-002', 'Efferalgan', 1, 3, 'Viên sủi', '500mg', 'Viên', 'Tuýp 10 viên'),
('ANP-PAR-TAB-325MG-PYM-001', 'Panadol Extra', 1, 4, 'Viên nén', '325mg', 'Viên', 'Hộp 12 vỉ x 10 viên'),
('ANP-PAR-SYR-120MG-ABT-001', 'Hapacol 150', 1, 1, 'Bột pha', '150mg', 'Gói', 'Hộp 24 gói'),

-- Amoxicillin brands
('ANT-AMX-CAP-500MG-DHG-001', 'Amoxicillin DHG', 2, 1, 'Viên nang', '500mg', 'Viên', 'Hộp 10 vỉ x 10 viên'),
('ANT-AMX-CAP-500MG-PYM-001', 'Amoxicillin Pymepharco', 2, 2, 'Viên nang', '500mg', 'Viên', 'Hộp 10 vỉ x 10 viên'),
('ANT-AMX-SYR-250MG-GSK-001', 'Augmentin', 2, 4, 'Bột pha', '250mg/5ml', 'Chai', 'Chai 60ml'),

-- Omeprazole brands
('GIT-OME-CAP-20MG-STL-001', 'Omeprazole Stella', 3, 7, 'Viên nang', '20mg', 'Viên', 'Hộp 3 vỉ x 10 viên'),
('GIT-OME-CAP-20MG-ABT-001', 'Losec', 3, 6, 'Viên nang', '20mg', 'Viên', 'Hộp 2 vỉ x 7 viên'),

-- Cetirizine brands
('ALG-CET-TAB-10MG-DHG-001', 'Cetirizine DHG', 4, 1, 'Viên nén', '10mg', 'Viên', 'Hộp 10 vỉ x 10 viên'),
('ALG-CET-SYR-5MG-GSK-001', 'Zyrtec', 4, 4, 'Siro', '5mg/5ml', 'Chai', 'Chai 60ml'),

-- Ibuprofen brands
('ANP-IBU-TAB-400MG-ABT-001', 'Advil', 5, 6, 'Viên nén', '400mg', 'Viên', 'Hộp 5 vỉ x 10 viên'),
('ANP-IBU-TAB-200MG-PFZ-001', 'Brufen', 5, 5, 'Viên nén', '200mg', 'Viên', 'Hộp 3 vỉ x 10 viên');

-- Giá thuốc
INSERT INTO drug_prices (brand_drug_id, cost_price, selling_price, effective_date) VALUES
(1, 2000, 3500, '2024-01-01'),     -- Panadol 500mg
(2, 3000, 5000, '2024-01-01'),     -- Efferalgan
(3, 2500, 4000, '2024-01-01'),     -- Panadol Extra
(4, 1500, 2500, '2024-01-01'),     -- Hapacol
(5, 800, 1500, '2024-01-01'),      -- Amoxicillin DHG
(6, 900, 1600, '2024-01-01'),      -- Amoxicillin Pymepharco
(7, 50000, 85000, '2024-01-01'),   -- Augmentin
(8, 1000, 2000, '2024-01-01'),     -- Omeprazole Stella
(9, 8000, 15000, '2024-01-01'),    -- Losec
(10, 500, 1000, '2024-01-01'),     -- Cetirizine DHG
(11, 25000, 45000, '2024-01-01'),  -- Zyrtec
(12, 3000, 5500, '2024-01-01'),    -- Advil
(13, 2000, 3500, '2024-01-01');    -- Brufen

-- Tồn kho (nhiều lô với hạn sử dụng khác nhau)
INSERT INTO drug_inventory (brand_drug_id, store_id, batch_number, manufacturing_date, expiry_date, quantity, import_date) VALUES
-- Cửa hàng 1
(1, 1, 'PAN-2023-001', '2023-01-15', '2025-01-15', 200, '2023-06-01'),
(1, 1, 'PAN-2024-001', '2024-01-10', '2026-01-10', 500, '2024-03-01'),
(1, 1, 'PAN-2023-002', '2023-06-01', '2024-12-01', 50, '2023-09-01'),  -- SẮP HẾT HẠN!
(2, 1, 'EFF-2024-001', '2024-02-01', '2026-02-01', 300, '2024-04-01'),
(5, 1, 'AMX-2024-001', '2024-01-01', '2026-01-01', 1000, '2024-02-01'),
(8, 1, 'OME-2024-001', '2024-03-01', '2026-03-01', 500, '2024-05-01'),
(10, 1, 'CET-2024-001', '2024-02-15', '2026-02-15', 400, '2024-04-01'),
(12, 1, 'ADV-2024-001', '2024-01-20', '2026-01-20', 200, '2024-03-15'),

-- Cửa hàng 2
(1, 2, 'PAN-2024-002', '2024-02-01', '2026-02-01', 300, '2024-04-01'),
(5, 2, 'AMX-2023-001', '2023-03-01', '2025-03-01', 150, '2023-06-01'),
(5, 2, 'AMX-2024-002', '2024-04-01', '2026-04-01', 800, '2024-06-01'),
(7, 2, 'AUG-2024-001', '2024-01-15', '2025-07-15', 100, '2024-03-01'),
(9, 2, 'LOS-2024-001', '2024-02-01', '2025-08-01', 200, '2024-04-01'),

-- Cửa hàng 3
(3, 3, 'PEX-2023-001', '2023-06-01', '2024-11-01', 30, '2023-08-01'),  -- ĐÃ HẾT HẠN!
(6, 3, 'APY-2024-001', '2024-03-01', '2026-03-01', 600, '2024-05-01'),
(11, 3, 'ZYR-2024-001', '2024-04-01', '2026-04-01', 150, '2024-06-01'),
(13, 3, 'BRU-2024-001', '2024-02-01', '2026-02-01', 250, '2024-04-01');

-- Sản phẩm khác
INSERT INTO other_products (product_code, product_name, category, manufacturer_id, unit) VALUES
('MED-SRG-001', 'Bơm tiêm 5ml', 'Bơm tiêm', 1, 'Cái'),
('MED-SRG-002', 'Bơm tiêm 10ml', 'Bơm tiêm', 1, 'Cái'),
('MED-MSK-001', 'Khẩu trang y tế 4 lớp', 'Khẩu trang', 8, 'Hộp'),
('MED-GLV-001', 'Găng tay y tế size M', 'Găng tay', 8, 'Hộp');

-- Khách hàng mẫu
INSERT INTO customers (full_name, phone, allergy_info) VALUES
('Nguyễn Văn Hùng', '0901234567', 'Dị ứng Penicillin'),
('Trần Thị Mai', '0912345678', NULL),
('Lê Hoàng Nam', '0923456789', 'Dị ứng Aspirin');

-- =====================================================
-- VIEW: Thuốc sắp hết hạn
-- =====================================================
CREATE OR REPLACE VIEW v_expiring_drugs AS
SELECT 
    di.inventory_id,
    s.store_code,
    s.store_name,
    bd.drug_code,
    bd.brand_name,
    gd.generic_name,
    bd.strength,
    di.batch_number,
    di.expiry_date,
    di.quantity,
    (di.expiry_date - CURRENT_DATE) AS days_remaining,
    CASE 
        WHEN di.expiry_date <= CURRENT_DATE THEN 'HẾT HẠN'
        WHEN di.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'KHẨN CẤP'
        WHEN di.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'CẢNH BÁO'
        ELSE 'BÌNH THƯỜNG'
    END AS trang_thai
FROM drug_inventory di
JOIN stores s ON di.store_id = s.store_id
JOIN brand_drugs bd ON di.brand_drug_id = bd.brand_drug_id
JOIN generic_drugs gd ON bd.generic_drug_id = gd.generic_drug_id
WHERE di.status = 'ACTIVE' AND di.quantity > 0
ORDER BY di.expiry_date ASC;
