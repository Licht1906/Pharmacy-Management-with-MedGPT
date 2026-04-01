import React, {useState, useEffect} from "react";
import {Table, Button, Modal, Form, Input, InputNumber, Select, DatePicker, message, Tag} from "antd";
import {PlusOutlined, EditOutlined, DeleteOutlined, MedicineBoxOutlined} from "@ant-design/icons";
import {getMedicalSupplies, createMedicalSupply, updateMedicalSupply, deleteMedicalSupply, getManufacturers, getProductCategories} from "../services/api";

const ManageMedicalSupplies = () => {
    const [data, setData] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [supplies, mf, cats] = await Promise.all([
                getMedicalSupplies(),
                getManufacturers(),
                getProductCategories()
            ]);
            setData(supplies);
            setManufacturers(mf.data);
            setCategories(cats);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {fetchData();}, []);

    const handleSubmit = async (values) => {
        try {
            if (editing) {
                await updateMedicalSupply(editing.product_id, values);
                message.success('Đã cập nhật');
            } else {
                await createMedicalSupply(values);
                message.success('Đã thêm vật dụng y tế');
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
            await deleteMedicalSupply(id);
            message.success('Đã xóa');
            fetchData();
        } catch (e) {
            message.error('Lỗi xóa');
        }
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
        {
            title: 'Mã sản phẩm',
            dataIndex: 'product_code',
            key: 'product_code',
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'product_name',
            key: 'product_name',
            render: (v, r) => <div><b>{v}</b><br /><small style={{ color: '#999' }}>{r.product_code}</small></div>
        },
        {
            title: 'Danh mục',
            dataIndex: 'category',
            key: 'category',
            render: (v) => v ? <Tag color="blue">{v}</Tag> : '-'
        },
        {
            title: 'Nhà sản xuất',
            dataIndex: 'manufacturer_name',
            key: 'manufacturer_name',
        },
        {
            title: 'Đơn vị',
            dataIndex: 'unit',
            key: 'unit',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoạt động' : 'Ngừng'}</Tag>
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <span>
                    <Button type="link" onClick={() => openEdit(record)}>
                        <EditOutlined />
                    </Button>
                    <Button type="link" danger onClick={() => handleDelete(record.product_id)}>
                        <DeleteOutlined />
                    </Button>
                </span>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2><MedicineBoxOutlined /> Quản Lý Vật Dụng Y Tế</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ marginBottom: 16 }}>
                    Thêm vật dụng y tế
                </Button>
            </div>
            <Table columns={columns} dataSource={data} loading={loading} rowKey="product_id" pagination={{ pageSize: 10 }} />

            <Modal
                title={editing ? 'Sửa vật dụng y tế' : 'Thêm vật dụng y tế'}
                open={modalOpen}
                onCancel={() => {setModalOpen(false); setEditing(null); form.resetFields();}}
                onOk={() => form.submit()}
                width={700}
            >
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="product_code" label="Mã sản phẩm" rules={[{ required: true, message: 'Vui lòng nhập mã sản phẩm' }]}>
                            <Input placeholder="VD: MS-001" />
                        </Form.Item>
                        <Form.Item name="product_name" label="Tên sản phẩm" rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}>
                            <Input placeholder="VD: Băng gạc y tế" />
                        </Form.Item>
                        <Form.Item name="category" label="Danh mục">
                            <Select placeholder="Chọn danh mục" allowClear>
                                {categories.map(cat => (
                                    <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="manufacturer_id" label="Nhà sản xuất" rules={[{ required: true, message: 'Vui lòng chọn nhà sản xuất' }]}>
                            <Select placeholder="Chọn nhà sản xuất" showSearch optionFilterProp="children">
                                {manufacturers.map(m => (
                                    <Select.Option key={m.manufacturer_id} value={m.manufacturer_id}>
                                        {m.manufacturer_name} ({m.abbreviation})
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="unit" label="Đơn vị" rules={[{ required: true, message: 'Vui lòng nhập đơn vị' }]}>
                            <Input placeholder="VD: Hộp, Chai, Cái" />
                        </Form.Item>
                        <Form.Item name="barcode" label="Barcode">
                            <Input placeholder="Mã vạch sản phẩm" />
                        </Form.Item>
                    </div>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={3} placeholder="Mô tả chi tiết về sản phẩm" />
                    </Form.Item>
                    <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                        <Select placeholder="Chọn trạng thái">
                            <Select.Option value={true}>Hoạt động</Select.Option>
                            <Select.Option value={false}>Ngừng hoạt động</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageMedicalSupplies;