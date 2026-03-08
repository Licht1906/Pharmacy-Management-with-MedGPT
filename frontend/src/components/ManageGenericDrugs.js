import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { getGenericDrugs, createGenericDrug, updateGenericDrug, deleteGenericDrug } from '../services/api';

const ManageGenericDrugs = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await getGenericDrugs();
            setData(result.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (values) => {
        try {
            if (editing) {
                await updateGenericDrug(editing.generic_drug_id, values);
                message.success('Đã cập nhật');
            } else {
                await createGenericDrug(values);
                message.success('Đã thêm thuốc gốc');
            }
            setModalOpen(false);
            form.resetFields();
            setEditing(null);
            fetchData();
        } catch (e) {
            message.error('Lỗi: ' + (e.response?.data?.detail || e.message));
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteGenericDrug(id);
            message.success('Đã xóa');
            fetchData();
        } catch (e) { message.error('Lỗi xóa'); }
    };

    const openEdit = (record) => {
        setEditing(record);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const columns = [
        { title: 'ID', dataIndex: 'generic_drug_id', width: 60 },
        {
            title: 'Tên thuốc gốc', dataIndex: 'generic_name',
            render: (text) => <b>{text}</b>
        },
        { title: 'Nhóm', dataIndex: 'drug_category', render: (v) => v ? <Tag color="blue">{v}</Tag> : '-' },
        { title: 'Công dụng', dataIndex: 'usage_info', ellipsis: true },
        {
            title: 'Kê đơn', dataIndex: 'requires_prescription', width: 80,
            render: (v) => v ? <Tag color="red">Có</Tag> : <Tag color="green">Không</Tag>
        },
        {
            title: 'Thao tác', width: 120,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    <Popconfirm title="Xóa thuốc này?" onConfirm={() => handleDelete(record.generic_drug_id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2><MedicineBoxOutlined /> Quản Lý Thuốc Gốc</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm thuốc gốc</Button>
            </div>

            <Table columns={columns} dataSource={data} loading={loading}
                rowKey="generic_drug_id" pagination={{ pageSize: 10 }} />

            <Modal
                title={editing ? 'Sửa thuốc gốc' : 'Thêm thuốc gốc'}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); }}
                onOk={() => form.submit()}
                width={700}
            >
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item name="generic_name" label="Tên thuốc gốc" rules={[{ required: true }]}>
                        <Input placeholder="VD: Paracetamol" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="usage_info" label="Công dụng">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="dosage_guide" label="Liều dùng">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="side_effects" label="Tác dụng phụ">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="contraindications" label="Chống chỉ định">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="drug_category" label="Nhóm thuốc">
                        <Select placeholder="Chọn nhóm">
                            <Select.Option value="Giảm đau hạ sốt">Giảm đau hạ sốt</Select.Option>
                            <Select.Option value="Kháng sinh">Kháng sinh</Select.Option>
                            <Select.Option value="Tiêu hóa">Tiêu hóa</Select.Option>
                            <Select.Option value="Dị ứng">Dị ứng</Select.Option>
                            <Select.Option value="Tim mạch">Tim mạch</Select.Option>
                            <Select.Option value="Hô hấp">Hô hấp</Select.Option>
                            <Select.Option value="Vitamin">Vitamin</Select.Option>
                            <Select.Option value="Da liễu">Da liễu</Select.Option>
                            <Select.Option value="Khác">Khác</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="requires_prescription" label="Cần kê đơn" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageGenericDrugs;