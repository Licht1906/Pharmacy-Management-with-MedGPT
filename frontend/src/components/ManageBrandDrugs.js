import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag, Upload, Image, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DatabaseOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { getBrandDrugs, createBrandDrug, updateBrandDrug, deleteBrandDrug, getGenericDrugs, getManufacturers, uploadImage } from '../services/api';

const ManageBrandDrugs = () => {
    const [data, setData] = useState([]);
    const [generics, setGenerics] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [brands, gens, mfrs] = await Promise.all([
                getBrandDrugs(), getGenericDrugs(), getManufacturers()
            ]);
            setData(brands.data);
            setGenerics(gens.data);
            setManufacturers(mfrs.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (values) => {
        try {
            if (editingId) {
                await updateBrandDrug(editingId, values);
                message.success('Đã cập nhật biệt dược');
            } else {
                await createBrandDrug(values);
                message.success('Đã thêm biệt dược');
            }
            setModalOpen(false);
            setEditingId(null);
            setImageUrl(null);
            form.resetFields();
            fetchData();
        } catch (e) {
            message.error('Lỗi: ' + (e.response?.data?.detail || e.message));
        }
    };

    const handleEdit = (record) => {
        setEditingId(record.brand_drug_id);
        form.setFieldsValue(record);
        setImageUrl(record.image_url);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteBrandDrug(id);
            message.success('Đã xóa biệt dược');
            fetchData();
        } catch (e) {
            message.error('Lỗi khi xóa: ' + (e.response?.data?.detail || e.message));
        }
    };

    const columns = [
        {
            title: 'Ảnh', dataIndex: 'image_url',
            render: (url) => (url && url !== "null" && url !== "None") ? <Image width={50} src={`http://localhost:8000${url}`} /> : '-'
        },
        {
            title: 'Mã thuốc', dataIndex: 'drug_code',
            render: (v) => <code style={{ color: '#722ed1', background: '#f9f0ff', padding: '2px 6px', borderRadius: 4 }}>{v}</code>
        },
        {
            title: 'Biệt dược', dataIndex: 'brand_name',
            render: (text, r) => <div><b>{text}</b> {r.strength}<br /><small style={{ color: '#999' }}>{r.dosage_form}</small></div>
        },
        { title: 'Thuốc gốc', dataIndex: 'generic_name', render: (v) => <Tag color="blue">{v}</Tag> },
        { title: 'NSX', dataIndex: 'manufacturer_name' },
        {
            title: 'Giá bán', dataIndex: 'selling_price',
            render: (v) => v ? <b style={{ color: '#f5222d' }}>{v.toLocaleString()}đ</b> : '-'
        },
        { title: 'Đóng gói', dataIndex: 'packaging', ellipsis: true },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="Xóa thuốc này?" onConfirm={() => handleDelete(record.brand_drug_id)}>
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2><DatabaseOutlined /> Quản Lý Biệt Dược</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                    form.resetFields();
                    setEditingId(null);
                    setImageUrl(null);
                    setModalOpen(true);
                }}>Thêm biệt dược</Button>
            </div>

            <Table columns={columns} dataSource={data} loading={loading}
                rowKey="brand_drug_id" pagination={{ pageSize: 10 }} />

            <Modal title={editingId ? "Sửa biệt dược" : "Thêm biệt dược"} open={modalOpen}
                onCancel={() => {
                    setModalOpen(false);
                    setEditingId(null);
                    setImageUrl(null);
                }} onOk={() => form.submit()} width={600}>
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item label="Ảnh thuốc" valuePropName="fileList" getValueFromEvent={(e) => {
                        if (Array.isArray(e)) return e;
                        return e && e.fileList;
                    }}>
                        <Upload
                            name="file"
                            listType="picture-card"
                            showUploadList={false}
                            customRequest={async (options) => {
                                const { file, onSuccess, onError } = options;
                                try {
                                    const res = await uploadImage(file);
                                    setImageUrl(res.image_url);
                                    form.setFieldsValue({ image_url: res.image_url });
                                    onSuccess("Ok");
                                    message.success('Tải ảnh lên thành công');
                                } catch (e) {
                                    onError(e);
                                    message.error('Lỗi tải ảnh');
                                }
                            }}
                        >
                            {imageUrl ? (
                                <img src={`http://localhost:8000${imageUrl}`} alt="avatar" style={{ width: '100%' }} />
                            ) : (
                                <div>
                                    <UploadOutlined />
                                    <div style={{ marginTop: 8 }}>Tải ảnh</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>
                    <Form.Item name="image_url" hidden><Input /></Form.Item>
                    
                    <Form.Item name="drug_code" label="Mã thuốc" rules={[{ required: true }]}>
                        <Input placeholder="VD: ANP-PAR-TAB-500MG-GSK-002" />
                    </Form.Item>
                    <Form.Item name="brand_name" label="Tên biệt dược" rules={[{ required: true }]}>
                        <Input placeholder="VD: Panadol" />
                    </Form.Item>
                    <Form.Item name="generic_drug_id" label="Thuốc gốc" rules={[{ required: true }]}>
                        <Select placeholder="Chọn thuốc gốc" showSearch optionFilterProp="children">
                            {generics.map(g => (
                                <Select.Option key={g.generic_drug_id} value={g.generic_drug_id}>{g.generic_name}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="manufacturer_id" label="Nhà sản xuất" rules={[{ required: true }]}>
                        <Select placeholder="Chọn NSX" showSearch optionFilterProp="children">
                            {manufacturers.map(m => (
                                <Select.Option key={m.manufacturer_id} value={m.manufacturer_id}>
                                    {m.manufacturer_name} ({m.abbreviation})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="dosage_form" label="Dạng bào chế">
                        <Select placeholder="Chọn dạng">
                            {['Viên nén', 'Viên nang', 'Viên sủi', 'Siro', 'Bột pha', 'Tiêm', 'Kem', 'Gel', 'Nhỏ mắt'].map(d => (
                                <Select.Option key={d} value={d}>{d}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="strength" label="Hàm lượng">
                        <Input placeholder="VD: 500mg" />
                    </Form.Item>
                    <Form.Item name="unit" label="Đơn vị">
                        <Input placeholder="VD: Viên, Chai, Hộp" />
                    </Form.Item>
                    <Form.Item name="packaging" label="Đóng gói">
                        <Input placeholder="VD: Hộp 10 vỉ x 10 viên" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageBrandDrugs;