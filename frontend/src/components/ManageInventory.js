import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Tag } from 'antd';
import { PlusOutlined, InboxOutlined } from '@ant-design/icons';
import { getInventory, importInventory, getBrandDrugs, getStores } from '../services/api';

const ManageInventory = () => {
    const [data, setData] = useState([]);
    const [brands, setBrands] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [storeFilter, setStoreFilter] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [inv, bds, sts] = await Promise.all([
                getInventory(storeFilter), getBrandDrugs(), getStores()
            ]);
            setData(inv.data);
            setBrands(bds.data);
            setStores(sts.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [storeFilter]);

    const handleSubmit = async (values) => {
        try {
            const payload = {
                ...values,
                expiry_date: values.expiry_date.format('YYYY-MM-DD'),
                manufacturing_date: values.manufacturing_date?.format('YYYY-MM-DD') || null,
            };
            await importInventory(payload);
            message.success('Nhập kho thành công');
            setModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (e) { message.error('Lỗi nhập kho'); }
    };

    const statusColors = { 'OK': 'green', 'CẢNH BÁO': 'gold', 'KHẨN CẤP': 'orange', 'HẾT HẠN': 'red' };

    const columns = [
        {
            title: 'Thuốc', dataIndex: 'brand_name',
            render: (v, r) => <div><b>{v}</b> {r.strength}<br /><small style={{ color: '#999' }}>{r.drug_code}</small></div>
        },
        { title: 'Cửa hàng', dataIndex: 'store_name' },
        { title: 'Số lô', dataIndex: 'batch_number' },
        { title: 'HSD', dataIndex: 'expiry_date', render: (v) => <Tag color="blue">{v}</Tag> },
        {
            title: 'Còn (ngày)', dataIndex: 'days_remaining',
            render: (v) => <span style={{ color: v <= 0 ? '#f5222d' : v <= 30 ? '#fa8c16' : '#52c41a' }}>{v}</span>
        },
        { title: 'Số lượng', dataIndex: 'quantity', render: (v) => <b>{v}</b> },
        {
            title: 'Trạng thái', dataIndex: 'status',
            render: (v) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2><InboxOutlined /> Quản Lý Tồn Kho</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Select placeholder="Tất cả cửa hàng" allowClear onChange={setStoreFilter} style={{ width: 250 }}>
                        {stores.map(s => <Select.Option key={s.store_id} value={s.store_id}>{s.store_code} - {s.store_name}</Select.Option>)}
                    </Select>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Nhập kho</Button>
                </div>
            </div>

            <Table columns={columns} dataSource={data.map((d, i) => ({ ...d, key: i }))}
                loading={loading} pagination={{ pageSize: 15 }} />

            <Modal title="Nhập kho" open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
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
                    <Form.Item name="store_id" label="Cửa hàng" rules={[{ required: true }]}>
                        <Select placeholder="Chọn cửa hàng">
                            {stores.map(s => <Select.Option key={s.store_id} value={s.store_id}>{s.store_code} - {s.store_name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="batch_number" label="Số lô" rules={[{ required: true }]}>
                        <Input placeholder="VD: PAN-2025-001" />
                    </Form.Item>
                    <Form.Item name="manufacturing_date" label="Ngày sản xuất">
                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="expiry_date" label="Hạn sử dụng" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="supplier_info" label="Thông tin nhà cung cấp">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageInventory;