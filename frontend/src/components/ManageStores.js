import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, ShopOutlined, DeleteOutlined } from '@ant-design/icons';
import { getStores, createStore, deleteStore } from '../services/api';

const ManageStores = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try { const r = await getStores(); setData(r.data); } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (values) => {
        try {
            await createStore(values);
            message.success('Đã thêm cửa hàng');
            setModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (e) { message.error('Lỗi'); }
    };

    const handleDelete = async (storeId) => {
        try {
            await deleteStore(storeId);
            message.success('Đã xóa cửa hàng');
            fetchData();
        } catch (e) {
            message.error('Lỗi khi xóa cửa hàng');
        }
    };

    const columns = [
        { title: 'Mã', dataIndex: 'store_code', render: (v) => <Tag color="blue">{v}</Tag> },
        { title: 'Tên cửa hàng', dataIndex: 'store_name', render: (v) => <b>{v}</b> },
        { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true },
        { title: 'SĐT', dataIndex: 'phone' },
        { title: 'Quản lý', dataIndex: 'manager_name' },
        { title: 'Dược sĩ', dataIndex: 'pharmacist_name' },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (_, record) => (
                <Popconfirm
                    title="Bạn có chắc muốn xóa cửa hàng này?"
                    onConfirm={() => handleDelete(record.store_id)}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button type="link" danger icon={<DeleteOutlined />}>
                        Xóa
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2><ShopOutlined /> Quản Lý Cửa Hàng</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Thêm cửa hàng</Button>
            </div>

            <Table columns={columns} dataSource={data} loading={loading}
                rowKey="store_id" pagination={{ pageSize: 10 }} />

            <Modal title="Thêm cửa hàng" open={modalOpen}
                onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item name="store_code" label="Mã cửa hàng" rules={[{ required: true }]}>
                        <Input placeholder="VD: CH004" />
                    </Form.Item>
                    <Form.Item name="store_name" label="Tên cửa hàng" rules={[{ required: true }]}>
                        <Input placeholder="VD: Nhà thuốc Quận 7" />
                    </Form.Item>
                    <Form.Item name="address" label="Địa chỉ" rules={[{ required: true }]}>
                        <Input placeholder="VD: 123 Nguyễn Thị Thập, Q.7" />
                    </Form.Item>
                    <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
                    <Form.Item name="manager_name" label="Quản lý"><Input /></Form.Item>
                    <Form.Item name="pharmacist_name" label="Dược sĩ phụ trách"><Input /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageStores;