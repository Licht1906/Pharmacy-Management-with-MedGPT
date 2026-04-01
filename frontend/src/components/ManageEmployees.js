import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Alert, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, TeamOutlined, LockOutlined, DeleteOutlined } from '@ant-design/icons';
import { getEmployees, createEmployee, getStores, deleteEmployee } from '../services/api';

const ManageEmployees = ({ user }) => {
    const [data, setData] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    // Kiểm tra quyền
    const canCreate = user && (user.role === 'OWNER' || user.role === 'MANAGER');
    const isOwner = user && user.role === 'OWNER';

    const fetchData = async () => {
        setLoading(true);
        try {
            const [emps, sts] = await Promise.all([getEmployees(), getStores()]);
            setData(emps.data);
            setStores(sts.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (values) => {
        try {
            // Gửi kèm ID người tạo để backend kiểm tra quyền
            const payload = {
                ...values,
                created_by_id: user.employee_id
            };
            await createEmployee(payload);
            message.success('Đã thêm nhân viên');
            setModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (e) {
            message.error(e.response?.data?.detail || 'Lỗi thêm nhân viên');
        }
    };

    const handleDelete = async (employeeId) => {
        try {
            await deleteEmployee(employeeId, user.employee_id);
            message.success('Đã xóa nhân viên thành công');
            fetchData();
        } catch (e) {
            message.error(e.response?.data?.detail || 'Lỗi khi xóa nhân viên');
        }
    };

    // Vai trò được phép tạo (tùy theo quyền người dùng)
    const getAllowedRoles = () => {
        if (isOwner) {
            return ['OWNER', 'MANAGER', 'PHARMACIST', 'STAFF', 'CONSULTANT'];
        }
        // MANAGER chỉ được tạo STAFF, PHARMACIST, CONSULTANT
        return ['PHARMACIST', 'STAFF', 'CONSULTANT'];
    };

    const roleColors = {
        'OWNER': 'red',
        'MANAGER': 'orange',
        'PHARMACIST': 'blue',
        'STAFF': 'green',
        'CONSULTANT': 'purple'
    };

    const roleLabels = {
        'OWNER': 'Chủ chuỗi',
        'MANAGER': 'Quản lý',
        'PHARMACIST': 'Dược sĩ',
        'STAFF': 'Nhân viên',
        'CONSULTANT': 'Tư vấn viên'
    };

    const columns = [
        { title: 'Mã NV', dataIndex: 'employee_code', width: 80 },
        { title: 'Họ tên', dataIndex: 'full_name', render: (v) => <b>{v}</b> },
        {
            title: 'Vai trò', dataIndex: 'role',
            render: (v) => (
                <Tag color={roleColors[v] || 'default'}>
                    {roleLabels[v] || v}
                </Tag>
            )
        },
        { title: 'Cửa hàng', dataIndex: 'store_name' },
        { title: 'SĐT', dataIndex: 'phone' },
        { title: 'Username', dataIndex: 'username' },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => {
                let canDeleteRecord = false;
                let disableReason = '';

                if (!canCreate) {
                    canDeleteRecord = false;
                    disableReason = 'Bạn không có quyền xóa nhân viên';
                } else if (record.employee_id === user?.employee_id) {
                    canDeleteRecord = false;
                    disableReason = 'Không thể tự xóa chính mình';
                } else if (isOwner) {
                    canDeleteRecord = true;
                } else if (user?.role === 'MANAGER') {
                    if (record.role === 'OWNER' || record.role === 'MANAGER') {
                        canDeleteRecord = false;
                        disableReason = 'Quản lý không thể xóa Chủ chuỗi hoặc Quản lý khác';
                    } else {
                        canDeleteRecord = true;
                    }
                }

                if (!canDeleteRecord) {
                    return (
                        <Tooltip title={disableReason}>
                            <Button disabled danger icon={<DeleteOutlined />} size="small" />
                        </Tooltip>
                    );
                }

                return (
                    <Popconfirm
                        title={`Bạn có chắc muốn xóa nhân viên ${record.full_name}?`}
                        onConfirm={() => handleDelete(record.employee_id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                );
            }
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2><TeamOutlined /> Quản Lý Nhân Viên</h2>

                {canCreate ? (
                    <Button type="primary" icon={<PlusOutlined />}
                        onClick={() => setModalOpen(true)}>
                        Thêm nhân viên
                    </Button>
                ) : (
                    <Button disabled icon={<LockOutlined />}>
                        Không có quyền thêm
                    </Button>
                )}
            </div>

            {/* Thông báo quyền */}
            {!canCreate && (
                <Alert
                    message="Bạn không có quyền thêm nhân viên"
                    description={`Vai trò hiện tại: ${roleLabels[user?.role] || user?.role}. Chỉ Chủ chuỗi (OWNER) hoặc Quản lý (MANAGER) mới được phép thêm nhân viên.`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            {canCreate && !isOwner && (
                <Alert
                    message="Quyền hạn chế"
                    description="Bạn là MANAGER, chỉ được thêm nhân viên vai trò: Dược sĩ, Nhân viên, Tư vấn viên."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <Table
                columns={columns}
                dataSource={data}
                loading={loading}
                rowKey="employee_id"
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title="Thêm nhân viên"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} onFinish={handleSubmit} layout="vertical">
                    <Form.Item name="employee_code" label="Mã NV" rules={[{ required: true }]}>
                        <Input placeholder="VD: NV005" />
                    </Form.Item>
                    <Form.Item name="full_name" label="Họ tên" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="store_id" label="Cửa hàng" rules={[{ required: true }]}>
                        <Select placeholder="Chọn cửa hàng">
                            {stores.map(s => (
                                <Select.Option key={s.store_id} value={s.store_id}>
                                    {s.store_code} - {s.store_name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
                        <Select placeholder="Chọn vai trò">
                            {getAllowedRoles().map(r => (
                                <Select.Option key={r} value={r}>
                                    <Tag color={roleColors[r]}>{roleLabels[r] || r}</Tag>
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
                    <Form.Item name="email" label="Email"><Input /></Form.Item>
                    <Form.Item name="username" label="Username"><Input /></Form.Item>
                    <Form.Item name="password" label="Mật khẩu" initialValue="123456">
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageEmployees;