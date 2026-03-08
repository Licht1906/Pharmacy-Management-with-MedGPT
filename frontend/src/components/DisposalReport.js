import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Select, Statistic, Row, Col, Button } from 'antd';
import {
    WarningOutlined, ReloadOutlined,
    ExclamationCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { getDisposalReport } from '../services/api';

const DisposalReport = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [storeId, setStoreId] = useState(null);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const result = await getDisposalReport(storeId, 90);
            setData(result);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReport();
    }, [storeId]);

    const columns = [
        {
            title: 'Thuốc', dataIndex: 'brand_name',
            render: (text, record) => (
                <div>
                    <strong>{text}</strong> {record.strength}
                    <br />
                    <small style={{ color: '#999' }}>Mã: {record.drug_code}</small>
                </div>
            )
        },
        { title: 'Cửa hàng', dataIndex: 'store_name' },
        { title: 'Lô', dataIndex: 'batch_number' },
        {
            title: 'Hạn sử dụng', dataIndex: 'expiry_date',
            render: (text) => <Tag color="red">{text}</Tag>
        },
        {
            title: 'Còn (ngày)', dataIndex: 'days_remaining',
            render: (days) => (
                <Tag color={days <= 0 ? 'red' : days <= 30 ? 'orange' : 'gold'}>
                    {days <= 0 ? `Quá hạn ${Math.abs(days)} ngày` : `${days} ngày`}
                </Tag>
            )
        },
        { title: 'Số lượng', dataIndex: 'quantity' },
        {
            title: 'Thiệt hại', dataIndex: 'estimated_loss',
            render: (v) => <span style={{ color: '#f5222d' }}>{v?.toLocaleString()}đ</span>
        },
    ];

    const allItems = [
        ...(data?.expired || []),
        ...(data?.critical || []),
        ...(data?.warning || []),
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2><WarningOutlined style={{ color: '#faad14' }} /> Báo Cáo Thuốc Cần Thanh Lý</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Select
                        placeholder="Tất cả cửa hàng"
                        allowClear
                        onChange={setStoreId}
                        style={{ width: 250 }}
                    >
                        <Select.Option value={1}>CH001 - Nhà thuốc Trung tâm</Select.Option>
                        <Select.Option value={2}>CH002 - Nhà thuốc Bình Thạnh</Select.Option>
                        <Select.Option value={3}>CH003 - Nhà thuốc Gò Vấp</Select.Option>
                    </Select>
                    <Button icon={<ReloadOutlined />} onClick={fetchReport}>
                        Làm mới
                    </Button>
                </div>
            </div>

            {/* Thống kê */}
            {data && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Đã hết hạn"
                                value={data.summary?.total_expired || 0}
                                prefix={<CloseCircleOutlined />}
                                valueStyle={{ color: '#f5222d' }}
                                suffix="lô"
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Khẩn cấp (< 30 ngày)"
                                value={data.summary?.total_critical || 0}
                                prefix={<ExclamationCircleOutlined />}
                                valueStyle={{ color: '#fa8c16' }}
                                suffix="lô"
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Cảnh báo (< 90 ngày)"
                                value={data.summary?.total_warning || 0}
                                prefix={<WarningOutlined />}
                                valueStyle={{ color: '#faad14' }}
                                suffix="lô"
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Thiệt hại ước tính"
                                value={data.summary?.estimated_total_loss || 0}
                                valueStyle={{ color: '#f5222d' }}
                                suffix="đ"
                                formatter={(v) => v.toLocaleString()}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Bảng chi tiết */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={allItems.map((item, idx) => ({ ...item, key: idx }))}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'Không có thuốc cần thanh lý' }}
                />
            </Card>
        </div>
    );
};

export default DisposalReport;