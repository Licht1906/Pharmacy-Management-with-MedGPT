import React, { useState } from 'react';
import { Input, Card, Tag, Spin, Empty } from 'antd';
import { SwapOutlined, SearchOutlined } from '@ant-design/icons';
import { findSubstitutes } from '../services/api';

const DrugSubstitute = () => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (value) => {
        if (!value) return;
        setLoading(true);
        try {
            const data = await findSubstitutes(value);
            setResult(data);
        } catch (e) {
            setResult({ found: false, message: 'Lỗi kết nối server' });
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: 24 }}>
            <h2><SwapOutlined /> Tra Cứu Thuốc Thay Thế</h2>
            <p style={{ color: '#666' }}>
                Tìm các thuốc cùng công dụng có thể thay thế khi không có thuốc cần tìm
            </p>

            <Input.Search
                size="large"
                placeholder="Nhập tên thuốc... VD: Paracetamol, Panadol, Amoxicillin"
                onSearch={handleSearch}
                enterButton={<><SearchOutlined /> Tìm thay thế</>}
                loading={loading}
                style={{ maxWidth: 600, marginBottom: 24 }}
            />

            {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}

            {result && !loading && (
                <>
                    {result.found ? (
                        <>
                            {/* Thuốc gốc */}
                            <Card
                                title={`💊 Thuốc gốc: ${result.original_drug.generic_name}`}
                                style={{ marginBottom: 16 }}
                            >
                                <p><strong>Mô tả:</strong> {result.original_drug.description}</p>
                                <p><strong>Công dụng:</strong> {result.original_drug.usage}</p>
                            </Card>

                            {/* Thuốc thay thế */}
                            {result.substitutes && result.substitutes.length > 0 ? (
                                result.substitutes.map((sub, idx) => (
                                    <Card
                                        key={idx}
                                        title={
                                            <>
                                                🔄 {sub.generic_name}
                                                <Tag color="orange" style={{ marginLeft: 8 }}>
                                                    Ưu tiên: {sub.priority}
                                                </Tag>
                                                <Tag color="blue">{sub.group}</Tag>
                                            </>
                                        }
                                        style={{ marginBottom: 16 }}
                                    >
                                        <p><strong>Công dụng:</strong> {sub.usage}</p>
                                        <p><strong>Mô tả:</strong> {sub.description}</p>

                                        {sub.brands && sub.brands.length > 0 && (
                                            <>
                                                <p><strong>Các biệt dược:</strong></p>
                                                {sub.brands.map((b, bidx) => (
                                                    <Tag key={bidx} color="green" style={{ margin: 4, padding: '4px 8px' }}>
                                                        {b.brand_name} {b.strength} ({b.dosage_form})
                                                    </Tag>
                                                ))}
                                            </>
                                        )}
                                    </Card>
                                ))
                            ) : (
                                <Empty description="Không tìm thấy thuốc thay thế trong hệ thống" />
                            )}
                        </>
                    ) : (
                        <Empty description={result.message} />
                    )}
                </>
            )}
        </div>
    );
};

export default DrugSubstitute;