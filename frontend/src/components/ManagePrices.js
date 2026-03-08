import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, InputNumber, Select, DatePicker, message, Tag } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { getPrices, createPrice, getBrandDrugs } from '../services/api';

const ManagePrices = () => {
    const [data, setData] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prices, bds] = await Promise.all([getPrices(), getBrandDrugs()]);
            setData(prices.data);
            setBrands(bds.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (values) => {
        try {
            const payload = {
                ...values,
                effective_date: values.effective_date?.format('YYYY-MM-DD') || null,
            };
            await createPrice(payload);
            message.success('Đã cập nhật giá');
            setModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (e) { message.error('Lỗi'); }
    };

    const columns = [
        {
            title: 'Thuốc', dataIndex: 'brand_name',
            render: (v, r) => <div><b>{v}</b> {r.strength}<br /><small style={{ color: '#999' }}>{r.drug_code}</small></div>
        },
        {
            title: 'Giá nhập', dataIndex: 'cost_price',
            render: (v) => <span>{v?.toLocaleString()}đ</span>
        },
        {
            title: 'Giá bán', dataIndex: 'selling_price',
            render: (v) => <b style={{ color: '#f5222d' }}>{v?.toLocaleString()}đ</b>
        },
        {
            title: 'Lợi nhuận', render: (_, r) => {
                const profit = r.selling_price - r.cost_price;
                const pct = ((profit / r.cost_price) * 100).toFixed(0);
                return <Tag color="green">{profit.toLocaleString()}đ ({pct}%)</Tag>;
            }
        },
        { title: 'Áp dụng từ', dataIndex: 'effective_date' },
        { title: 'Đến', dataIndex: 'end_date', render: (v) => v || <Tag color="green">Hiện tại</Tag> },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2><DollarOutlined /> Quản Lý Giá Thuốc</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Cập nhật giá</Button>
            </div>

            <Table columns={columns} dataSource={data} loading={loading}
                rowKey="price_id" pagination={{ pageSize: 15 }} />

            <Modal title="Cập nhật giá thuốc" open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item name="brand_drug_id" label="Thuốc" rules={[{ required: true }]}>
                        <Select placeholder="Chọn thuốc" showSearch optionFilterProp="children">
                            {brands.map(b => (
                                <Select.Option key={b.brand_drug_id} value={b.brand_drug_id}>
                                    {b.brand_name} {b.strength} ({b.drug_code})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="cost_price" label="Giá nhập (đ)" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                    </Form.Item>
                    <Form.Item name="selling_price" label="Giá bán (đ)" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                    </Form.Item>
                    <Form.Item name="effective_date" label="Ngày áp dụng">
                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManagePrices;