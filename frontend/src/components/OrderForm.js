import React, { useState, useEffect } from 'react';
import {
    Form, Input, InputNumber, Button, Select,
    Table, message, Card, Tag, Divider
} from 'antd';
import {
    ShoppingCartOutlined, PlusOutlined,
    DeleteOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { createOrder, searchDrugs, getStores } from '../services/api';

const OrderForm = () => {
    const [form] = Form.useForm();
    const [items, setItems] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [orderResult, setOrderResult] = useState(null);
    const [stores, setStores] = useState([]);

    // Fetch stores on component mount
    useEffect(() => {
        const fetchStores = async () => {
            try {
                const result = await getStores();
                setStores(result.data || []);
            } catch (e) {
                message.error('Lỗi tải danh sách cửa hàng');
            }
        };
        fetchStores();
    }, []);

    // Tìm thuốc
    const handleSearch = async (value) => {
        if (!value || value.length < 2) return;
        const storeId = form.getFieldValue('store_id');
        if (!storeId) {
            message.warning('Vui lòng chọn cửa hàng trước khi tìm thuốc');
            return;
        }

        setSearching(true);
        try {
            const result = await searchDrugs(value, storeId);
            if (result.found) {
                // Lọc thuốc có tồn kho > 0 để tránh hiển thị thuốc hết hàng tại cửa hàng đã chọn
                setSearchResults(result.results.filter(d => d.total_quantity > 0));
            } else {
                setSearchResults([]);
            }
        } catch (e) {
            message.error('Lỗi tìm kiếm');
        }
        setSearching(false);
    };

    // Thêm thuốc vào đơn
    const addItem = (drug) => {
        const existing = items.find(i => i.drug_code === drug.drug_code);
        if (existing) {
            message.warning('Thuốc đã có trong đơn');
            return;
        }
        setItems([...items, {
            key: drug.drug_code,
            drug_code: drug.drug_code,
            brand_name: drug.brand_name,
            strength: drug.strength,
            price: drug.price,
            total_quantity: drug.total_quantity,
            brand_drug_id: drug.brand_drug_id,
            quantity: 1,
        }]);
    };

    // Xóa thuốc khỏi đơn
    const removeItem = (key) => {
        setItems(items.filter(i => i.key !== key));
    };

    // Gửi đơn hàng
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (items.length === 0) {
                message.warning('Chưa có thuốc trong đơn');
                return;
            }

            setSubmitting(true);
            const orderData = {
                customer_name: values.customer_name,
                customer_phone: values.customer_phone,
                store_id: values.store_id,
                items: items.map(i => ({
                    brand_drug_id: i.brand_drug_id || 1,
                    quantity: i.quantity,
                })),
                notes: values.notes,
            };

            const result = await createOrder(orderData);
            setOrderResult(result);
            message.success('Tạo đơn hàng thành công!');
            setItems([]);
            form.resetFields();
        } catch (e) {
            let errorMsg = 'Lỗi tạo đơn hàng';
            if (e.response?.data?.detail) {
                if (Array.isArray(e.response.data.detail)) {
                    errorMsg = e.response.data.detail.map(err => err.msg || JSON.stringify(err)).join(', ');
                } else {
                    errorMsg = e.response.data.detail;
                }
            }
            message.error(errorMsg);
        }
        setSubmitting(false);
    };

    // Tổng tiền
    const totalAmount = items.reduce(
        (sum, i) => sum + (i.price || 0) * i.quantity, 0
    );

    const columns = [
        {
            title: 'Thuốc', dataIndex: 'brand_name',
            render: (text, record) => (
                <div>
                    <strong>{text}</strong> {record.strength}
                    <br />
                    <small style={{ color: '#999' }}>{record.drug_code}</small>
                </div>
            )
        },
        {
            title: 'Giá', dataIndex: 'price', width: 120,
            render: (v) => v ? `${v.toLocaleString()}đ` : 'N/A'
        },
        {
            title: 'Số lượng', dataIndex: 'quantity', width: 120,
            render: (_, record) => (
                <InputNumber
                    min={1}
                    max={record.total_quantity}
                    value={record.quantity}
                    onChange={(val) => {
                        setItems(items.map(i =>
                            i.key === record.key ? { ...i, quantity: val } : i
                        ));
                    }}
                />
            )
        },
        {
            title: 'Thành tiền', width: 140,
            render: (_, record) => (
                <strong>
                    {((record.price || 0) * record.quantity).toLocaleString()}đ
                </strong>
            )
        },
        {
            title: '', width: 50,
            render: (_, record) => (
                <Button
                    danger size="small" icon={<DeleteOutlined />}
                    onClick={() => removeItem(record.key)}
                />
            )
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <h2><ShoppingCartOutlined /> Tạo Đơn Hàng</h2>

            <div style={{ display: 'flex', gap: 24 }}>
                {/* Form thông tin */}
                <Card title="Thông tin đơn hàng" style={{ flex: 1 }}>
                    <Form form={form} layout="vertical">
                        <Form.Item label="Tên khách hàng" name="customer_name">
                            <Input placeholder="VD: Nguyễn Văn A" />
                        </Form.Item>
                        <Form.Item label="SĐT" name="customer_phone">
                            <Input placeholder="VD: 0901234567" />
                        </Form.Item>
                        <Form.Item label="Cửa hàng" name="store_id"
                            rules={[{ required: true, message: 'Chọn cửa hàng' }]}>
                            <Select placeholder="Chọn cửa hàng" showSearch optionFilterProp="children">
                                {stores.map(s => (
                                <Select.Option key={s.store_id} value={s.store_id}>
                                    {s.store_name}
                                </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label="Ghi chú" name="notes">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Form>
                </Card>

                {/* Tìm thuốc */}
                <Card title="Tìm thuốc" style={{ flex: 1 }}>
                    <Input.Search
                        placeholder="Nhập tên thuốc..."
                        onSearch={handleSearch}
                        loading={searching}
                        enterButton="Tìm"
                    />
                    <div style={{ marginTop: 16, maxHeight: 300, overflowY: 'auto' }}>
                        {searchResults.map((drug, idx) => (
                            <Card
                                key={idx} size="small"
                                style={{ marginBottom: 8, cursor: 'pointer' }}
                                onClick={() => addItem(drug)}
                                hoverable
                            >
                                <strong>{drug.brand_name}</strong> {drug.strength}
                                <br />
                                <Tag color="blue">{drug.price?.toLocaleString()}đ</Tag>
                                <Tag color="green">Tồn: {drug.total_quantity}</Tag>
                                <PlusOutlined style={{ float: 'right', color: '#1890ff' }} />
                            </Card>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Danh sách thuốc trong đơn */}
            <Card title="Chi tiết đơn hàng" style={{ marginTop: 24 }}>
                <Table
                    columns={columns}
                    dataSource={items}
                    pagination={false}
                    locale={{ emptyText: 'Chưa có thuốc. Tìm và thêm thuốc ở trên.' }}
                />
                <Divider />
                <div style={{ textAlign: 'right' }}>
                    <h3>Tổng tiền: <span style={{ color: '#f5222d' }}>
                        {totalAmount.toLocaleString()}đ
                    </span></h3>
                    <Button
                        type="primary" size="large"
                        icon={<CheckCircleOutlined />}
                        onClick={handleSubmit}
                        loading={submitting}
                        disabled={items.length === 0}
                    >
                        Xác nhận đơn hàng
                    </Button>
                </div>
            </Card>

            {/* Kết quả */}
            {orderResult && (
                <Card
                    title="✅ Đơn hàng đã tạo"
                    style={{ marginTop: 24, background: '#f6ffed', border: '1px solid #b7eb8f' }}
                >
                    <p><strong>Mã đơn:</strong> {orderResult.order_code}</p>
                    <p><strong>Tổng tiền:</strong> {orderResult.total_amount?.toLocaleString()}đ</p>
                    <p><strong>Trạng thái:</strong> <Tag color="green">{orderResult.status}</Tag></p>
                </Card>
            )}
        </div>
    );
};

export default OrderForm;