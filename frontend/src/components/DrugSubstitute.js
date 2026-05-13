import React, { useState } from 'react';
import { Input, Card, Row, Col, Typography, Spin, Empty, Result, Badge, Tag } from 'antd';
import { SwapOutlined, SearchOutlined } from '@ant-design/icons';
import { findSubstitutes } from '../services/api';

const { Title, Text } = Typography;

const DrugSubstitute = () => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // Flattened list of alternative brands
    const [alternativeBrands, setAlternativeBrands] = useState([]);
    // State for the currently selected alternative drug to show in the right panel
    const [selectedBrand, setSelectedBrand] = useState(null);

    const handleSearch = async (value) => {
        if (!value) return;
        setLoading(true);
        setSelectedBrand(null);
        try {
            const data = await findSubstitutes(value);
            setResult(data);

            if (data && data.found && data.substitutes) {
                // Flatten all brands from all substitutes into a single array
                const allBrands = [];
                data.substitutes.forEach(sub => {
                    if (sub.brands && sub.brands.length > 0) {
                        sub.brands.forEach(brand => {
                            allBrands.push({
                                ...brand,
                                stock_by_store: brand.stock_by_store || [],
                                substitute_info: {
                                    generic_name: sub.generic_name,
                                    group: sub.group,
                                    usage: sub.usage,
                                    dosage_guide: sub.dosage_guide,
                                    side_effects: sub.side_effects,
                                    description: sub.description
                                }
                            });
                        });
                    }
                });
                setAlternativeBrands(allBrands);

                // Select the first one by default if available
                if (allBrands.length > 0) {
                    setSelectedBrand(allBrands[0]);
                }
            } else {
                setAlternativeBrands([]);
            }
        } catch (e) {
            setResult({ found: false, message: 'Lỗi kết nối server' });
        }
        setLoading(false);
    };

    const renderImagePlaceholder = (size = 80, url = null) => {
        if (url && url !== "null" && url !== "None") {
            return (
                <div style={{
                    width: size,
                    height: size,
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff'
                }}>
                    <img src={`http://localhost:8000${url}`} alt="drug" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
            );
        }
        return (
            <div style={{
                width: size,
                height: size,
                backgroundColor: '#ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #bbb',
                position: 'relative'
            }}>
                <div style={{ position: 'absolute', width: '100%', height: '2px', backgroundColor: '#bbb', transform: 'rotate(45deg)' }}></div>
                <div style={{ position: 'absolute', width: '100%', height: '2px', backgroundColor: '#bbb', transform: 'rotate(-45deg)' }}></div>
            </div>
        );
    };

    return (
        <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <SwapOutlined style={{ fontSize: 24, marginRight: 8 }} />
                <Title level={2} style={{ margin: 0 }}>Tra Cứu Thuốc Thay Thế</Title>
            </div>

            <Input.Search
                size="large"
                placeholder="Nhập tên thuốc... VD: Paracetamol, Panadol, Amoxicillin"
                onSearch={handleSearch}
                enterButton={<><SearchOutlined /> Tìm thay thế</>}
                loading={loading}
                style={{ marginBottom: 24 }}
            />

            {loading && <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>}

            {result && !loading && !result.found && (
                <Result
                    status="warning"
                    title="Không tìm thấy kết quả"
                    subTitle={result.message || "Thuốc không tồn tại trong hệ thống hoặc không có dữ liệu thay thế."}
                />
            )}

            {result && !loading && result.found && (
                <Row gutter={24} style={{ flex: 1 }}>
                    {/* Left Column: Grid of Alternatives */}
                    <Col span={16} style={{ borderRight: '1px solid #f0f0f0', paddingRight: 24 }}>
                        {alternativeBrands.length === 0 ? (
                            <Empty description="Không có thuốc thay thế khả dụng" />
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: 16,
                                overflowY: 'auto',
                                paddingBottom: 24
                            }}>
                                {alternativeBrands.map((brand, idx) => (
                                    <Card
                                        key={idx}
                                        hoverable
                                        onClick={() => setSelectedBrand(brand)}
                                        style={{
                                            borderColor: selectedBrand === brand ? '#1890ff' : '#f0f0f0',
                                            boxShadow: selectedBrand === brand ? '0 0 8px rgba(24,144,255,0.2)' : 'none'
                                        }}
                                        bodyStyle={{ padding: 12, display: 'flex', alignItems: 'center' }}
                                    >
                                        {renderImagePlaceholder(80, brand.image_url)}
                                        <div style={{ marginLeft: 16, flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: 16 }}>{brand.brand_name}</div>
                                            <div style={{ color: '#666', fontSize: 13 }}>Hàm lượng: {brand.strength}</div>
                                            <div style={{ marginTop: 8 }}>
                                                <Badge status={brand.stock > 0 ? "success" : "error"} />
                                                <Text type={brand.stock > 0 ? "success" : "danger"}>
                                                    Tồn kho: {brand.stock}
                                                </Text>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </Col>

                    {/* Right Column: Details Panel */}
                    <Col span={8}>
                        <Card
                            title="Chi tiết thuốc"
                            bordered={false}
                            style={{ backgroundColor: '#f9f9f9', height: '100%', borderRadius: 8 }}
                            bodyStyle={{ padding: '0 24px 24px 24px' }}
                        >
                            {selectedBrand ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, marginTop: 24 }}>
                                        {renderImagePlaceholder(100, selectedBrand.image_url)}
                                        <div style={{ marginLeft: 16 }}>
                                            <Title level={4} style={{ margin: 0 }}>{selectedBrand.brand_name}</Title>
                                            <p style={{ margin: '4px 0', color: '#666' }}>Hàm lượng: {selectedBrand.strength}</p>
                                            <p style={{ margin: '4px 0', color: '#666' }}>Dạng: {selectedBrand.dosage_form}</p>
                                            <Badge status={selectedBrand.stock > 0 ? "success" : "error"} />
                                            <Text type={selectedBrand.stock > 0 ? "success" : "danger"} style={{ marginLeft: 8 }}>
                                                Tổng tồn kho: {selectedBrand.stock}
                                            </Text>
                                            
                                            {selectedBrand.stock_by_store && selectedBrand.stock_by_store.length > 0 && (
                                                <div style={{ marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #f0f0f0' }}>
                                                    <Text strong style={{ fontSize: 13 }}>Tồn kho chi tiết:</Text>
                                                    <ul style={{ paddingLeft: 20, margin: '4px 0 0 0', color: '#555', fontSize: 13 }}>
                                                        {selectedBrand.stock_by_store.map((s, idx) => (
                                                            <li key={idx}>
                                                                <Text strong>{s.store}</Text>: <Text type={s.quantity > 0 ? "success" : "danger"}>{s.quantity}</Text>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: 16 }}>
                                        <Text strong>Hoạt chất gốc:</Text>
                                        <p style={{ marginTop: 4, marginBottom: 0 }}>
                                            {selectedBrand.substitute_info.generic_name}
                                            {selectedBrand.substitute_info.group && (
                                                <Tag color="blue" style={{ marginLeft: 8 }}>{selectedBrand.substitute_info.group}</Tag>
                                            )}
                                        </p>
                                    </div>

                                    <div style={{ marginBottom: 16 }}>
                                        <Text strong>Hướng dẫn liều dùng:</Text>
                                        <ul style={{ paddingLeft: 20, marginTop: 8, color: '#555' }}>
                                            {selectedBrand.substitute_info.dosage_guide
                                                ? selectedBrand.substitute_info.dosage_guide.split('. ').map((item, i) => (
                                                    item.trim() && <li key={i}>{item.trim()}</li>
                                                ))
                                                : <li>Không có thông tin</li>
                                            }
                                        </ul>
                                    </div>

                                    <div style={{ marginBottom: 24 }}>
                                        <Text strong>Tác dụng phụ tiềm ẩn:</Text>
                                        <ul style={{ paddingLeft: 20, marginTop: 8, color: '#555' }}>
                                            {selectedBrand.substitute_info.side_effects
                                                ? selectedBrand.substitute_info.side_effects.split(',').map((item, i) => (
                                                    item.trim() && <li key={i}>{item.trim()}</li>
                                                ))
                                                : <li>Không có thông tin</li>
                                            }
                                        </ul>
                                    </div>


                                </>
                            ) : (
                                <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                                    Vui lòng chọn một thuốc từ danh sách để xem chi tiết
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default DrugSubstitute;