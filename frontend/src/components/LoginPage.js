import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { login } from '../services/api';

const { Title, Text } = Typography;

const LoginPage = ({ onLogin }) => {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const result = await login(values.username, values.password);
            if (result.success) {
                message.success(result.message);
                onLogin(result.employee);
            }
        } catch (error) {
            message.error(error.response?.data?.detail || 'Đăng nhập thất bại');
        }
        setLoading(false);
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
            <Card style={{
                width: 420,
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <MedicineBoxOutlined style={{ fontSize: 48, color: '#667eea' }} />
                    <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
                        Pharmacy Chain
                    </Title>
                    <Text type="secondary">Hệ thống quản lý chuỗi nhà thuốc</Text>
                </div>

                <Form onFinish={handleSubmit} size="large">
                    <Form.Item name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}
                            style={{
                                height: 44, borderRadius: 8,
                                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                border: 'none',
                            }}>
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
                    <p>Tài khoản mặc định: <b>admin</b> / <b>123456</b></p>
                    <p>Hoặc: binh_tt, cuong_lv, dung_pt / 123456</p>
                </div>
            </Card>
        </div>
    );
};

export default LoginPage;