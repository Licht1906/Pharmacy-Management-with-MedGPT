import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BankOutlined } from '@ant-design/icons';
import { getManufacturers, createManufacturer } from '../services/api';

const ManageManufacturers = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try { const r = await getManufacturers(); setData(r.data); } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (values) => {
        try {
            await createManufacturer(values);
            message.success('Đã thêm NSX');
            setModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (e) { message.error('Lỗi'); }
    };

    const columns = [
        { title: 'ID', dataIndex: 'manufacturer_id', width: 60 },
        { title: 'Tên NSX', dataIndex: 'manufacturer_name', render: (v) => <b>{v}</b> },
        { title: 'Viết tắt', dataIndex: 'abbreviation', render: (v) => <Tag color="purple">{v}</Tag> },
        { title: 'Nước SX', dataIndex: 'country', render: (v) => <Tag color="blue">{v}</Tag> },
        { title: 'SĐT', dataIndex: 'phone' },
        { title: 'Email', dataIndex: 'email' },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2><BankOutlined /> Quản Lý Nhà Sản Xuất</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Thêm NSX</Button>
            </div>

            <Table columns={columns} dataSource={data} loading={loading}
                rowKey="manufacturer_id" pagination={{ pageSize: 10 }} />

            <Modal title="Thêm nhà sản xuất" open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item name="manufacturer_name" label="Tên NSX" rules={[{ required: true }]}>
                        <Input placeholder="VD: DHG Pharma" />
                    </Form.Item>
                    <Form.Item name="abbreviation" label="Viết tắt" rules={[{ required: true }]}>
                        <Input placeholder="VD: DHG" maxLength={10} />
                    </Form.Item>
                    <Form.Item name="country" label="Nước sản xuất">
                        <Input placeholder="VD: Việt Nam" />
                    </Form.Item>
                    <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
                    <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
                    <Form.Item name="email" label="Email"><Input /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageManufacturers;