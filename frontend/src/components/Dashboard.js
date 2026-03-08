import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin } from 'antd';
import {
    MedicineBoxOutlined, ShopOutlined, TeamOutlined,
    ShoppingCartOutlined, DollarOutlined, WarningOutlined,
    DatabaseOutlined, UserOutlined
} from '@ant-design/icons';
import { getDashboard } from '../services/api';

const Dashboard = ({ user }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getDashboard();
                setData(result);
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

    const stats = [
        { title: 'Thuốc gốc', value: data?.total_generic_drugs || 0, icon: <MedicineBoxOutlined />, color: '#1890ff' },
        { title: 'Biệt dược', value: data?.total_brand_drugs || 0, icon: <DatabaseOutlined />, color: '#722ed1' },
        { title: 'Cửa hàng', value: data?.total_stores || 0, icon: <ShopOutlined />, color: '#13c2c2' },
        { title: 'Nhân viên', value: data?.total_employees || 0, icon: <TeamOutlined />, color: '#52c41a' },
        { title: 'Tổng tồn kho', value: data?.total_stock || 0, icon: <ShoppingCartOutlined />, color: '#fa8c16', suffix: 'sản phẩm' },
        { title: 'Khách hàng', value: data?.total_customers || 0, icon: <UserOutlined />, color: '#eb2f96' },
        { title: 'Thuốc hết hạn', value: data?.expired_count || 0, icon: <WarningOutlined />, color: '#f5222d' },
        { title: 'Sắp hết hạn', value: data?.expiring_count || 0, icon: <WarningOutlined />, color: '#faad14' },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 24 }}>
                <h2>📊 Dashboard</h2>
                <p style={{ color: '#666' }}>Chào mừng <b>{user?.full_name}</b> - {user?.store_name}</p>
            </div>

            <Row gutter={[16, 16]}>
                {stats.map((s, idx) => (
                    <Col xs={24} sm={12} md={6} key={idx}>
                        <Card hoverable>
                            <Statistic
                                title={s.title}
                                value={s.value}
                                prefix={React.cloneElement(s.icon, { style: { color: s.color } })}
                                valueStyle={{ color: s.color }}
                                suffix={s.suffix}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={16} style={{ marginTop: 24 }}>
                <Col span={12}>
                    <Card title="💰 Doanh thu">
                        <Statistic
                            title="Tổng doanh thu"
                            value={data?.total_revenue || 0}
                            prefix={<DollarOutlined />}
                            valueStyle={{ color: '#52c41a', fontSize: 28 }}
                            suffix="đ"
                            formatter={(v) => Number(v).toLocaleString()}
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="🛒 Đơn hàng hôm nay">
                        <Statistic
                            title="Số đơn hàng"
                            value={data?.today_orders || 0}
                            prefix={<ShoppingCartOutlined />}
                            valueStyle={{ color: '#1890ff', fontSize: 28 }}
                            suffix="đơn"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;