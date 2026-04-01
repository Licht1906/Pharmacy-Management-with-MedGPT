import React from 'react';
import { Menu, Typography, Button } from 'antd';
import {
    RobotOutlined, ShoppingCartOutlined, SwapOutlined,
    WarningOutlined, MedicineBoxOutlined, DashboardOutlined,
    DatabaseOutlined, BankOutlined, ShopOutlined,
    TeamOutlined, InboxOutlined, DollarOutlined,
    LogoutOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const Sidebar = ({ currentPage, onPageChange, user, onLogout }) => {
    const menuItems = [
        { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: 'chat', icon: <RobotOutlined />, label: 'MedGPT Chat' },
        { type: 'divider' },
        {
            key: 'business', label: 'Kinh doanh', type: 'group',
            children: [
                { key: 'orders', icon: <ShoppingCartOutlined />, label: 'Đơn Hàng' },
                { key: 'substitute', icon: <SwapOutlined />, label: 'Thuốc Thay Thế' },
                { key: 'disposal', icon: <WarningOutlined />, label: 'Thanh Lý' },
            ]
        },
        {
            key: 'manage', label: 'Quản lý', type: 'group',
            children: [
                { key: 'generic-drugs', icon: <MedicineBoxOutlined />, label: 'Thuốc Gốc' },
                { key: 'brand-drugs', icon: <DatabaseOutlined />, label: 'Biệt Dược' },
                { key: 'medical-supplies', icon: <MedicineBoxOutlined />, label: 'Vật Dụng Y Tế' },
                { key: 'manufacturers', icon: <BankOutlined />, label: 'Nhà Sản Xuất' },
                { key: 'stores', icon: <ShopOutlined />, label: 'Cửa Hàng' },
                { key: 'employees', icon: <TeamOutlined />, label: 'Nhân Viên' },
                { key: 'inventory', icon: <InboxOutlined />, label: 'Tồn Kho' },
                { key: 'prices', icon: <DollarOutlined />, label: 'Giá Thuốc' },
            ]
        },
    ];

    return (
        <div style={{
            width: 260, height: '100vh', background: '#001529',
            position: 'fixed', left: 0, top: 0,
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Logo */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #ffffff15' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MedicineBoxOutlined style={{ color: '#1890ff', fontSize: 28 }} />
                    <div>
                        <div style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Pharmacy Chain</div>
                        <div style={{ color: '#ffffff80', fontSize: 11 }}>Quản lý chuỗi nhà thuốc</div>
                    </div>
                </div>
            </div>

            {/* User info */}
            {user && (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #ffffff15', background: '#ffffff08' }}>
                    <Text style={{ color: '#ffffffCC', fontSize: 13 }}>👤 {user.full_name}</Text>
                    <br />
                    <Text style={{ color: '#ffffff80', fontSize: 11 }}>{user.role} - {user.store_name}</Text>
                </div>
            )}

            {/* Menu */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <Menu
                    theme="dark" mode="inline"
                    selectedKeys={[currentPage]}
                    onClick={({ key }) => onPageChange(key)}
                    items={menuItems}
                    style={{ borderRight: 0 }}
                />
            </div>

            {/* Logout */}
            <div style={{ padding: 16, borderTop: '1px solid #ffffff15' }}>
                <Button icon={<LogoutOutlined />} onClick={onLogout} block ghost
                    style={{ color: '#ffffff80', borderColor: '#ffffff30' }}>
                    Đăng xuất
                </Button>
            </div>
        </div>
    );
};

export default Sidebar;