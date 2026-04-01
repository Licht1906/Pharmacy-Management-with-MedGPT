import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Tag, Tabs } from 'antd';
import { PlusOutlined, InboxOutlined } from '@ant-design/icons';
import { getInventory, importInventory, getBrandDrugs, getStores, getProductInventory, importProductInventory, getMedicalSupplies } from '../services/api';

const ManageInventory = () => {
    const [data, setData] = useState([]);
    const [productData, setProductData] = useState([]);
    const [brands, setBrands] = useState([]);
    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [storeFilter, setStoreFilter] = useState(null);
    const [activeTab, setActiveTab] = useState('drugs');
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [inv, bds, sts, prodInv, prods] = await Promise.all([
                getInventory(storeFilter), getBrandDrugs(), getStores(),
                getProductInventory(storeFilter ? { store_id: storeFilter } : {}), getMedicalSupplies()
            ]);
            setData(inv.data);
            setBrands(bds.data);
            setStores(sts.data);
            setProductData(prodInv);
            setProducts(prods);
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
            
            if (activeTab === 'drugs') {
                await importInventory(payload);
            } else {
                await importProductInventory(payload);
            }
            
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

    const productColumns = [
        {
            title: 'Sản phẩm', dataIndex: 'product_name',
            render: (v, r) => <div><b>{v}</b><br /><small style={{ color: '#999' }}>{r.product_code}</small></div>
        },
        { title: 'Danh mục', dataIndex: 'category' },
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

            <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 16 }}>
                <Tabs.TabPane tab="Thuốc" key="drugs">
                    <Table columns={columns} dataSource={data.map((d, i) => ({ ...d, key: i }))}
                        loading={loading} pagination={{ pageSize: 15 }} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Vật dụng y tế" key="products">
                    <Table columns={productColumns} dataSource={productData.map((d, i) => ({ ...d, key: i }))}
                        loading={loading} pagination={{ pageSize: 15 }} />
                </Tabs.TabPane>
            </Tabs>

            <Modal title="Nhập kho" open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    {activeTab === 'drugs' ? (
                        <Form.Item name="brand_drug_id" label="Thuốc" rules={[{ required: true }]}>
                            <Select placeholder="Chọn thuốc" showSearch optionFilterProp="children">
                                {brands.map(b => (
                                    <Select.Option key={b.brand_drug_id} value={b.brand_drug_id}>
                                        {b.brand_name} {b.strength} ({b.drug_code})
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    ) : (
                        <Form.Item name="product_id" label="Vật dụng y tế" rules={[{ required: true }]}>
                            <Select placeholder="Chọn vật dụng y tế" showSearch optionFilterProp="children">
                                {products.map(p => (
                                    <Select.Option key={p.product_id} value={p.product_id}>
                                        {p.product_name} ({p.product_code})
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}
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