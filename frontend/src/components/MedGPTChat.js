import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Spin, Tag, Typography } from 'antd';
import {
    SendOutlined,
    RobotOutlined,
    UserOutlined,
    MedicineBoxOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatWithMedGPT } from '../services/api';

const { Text } = Typography;
const { TextArea } = Input;

// ================================
// STYLE CHO MARKDOWN
// ================================
const markdownStyles = {
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        margin: '12px 0',
        fontSize: 13,
        border: '1px solid #e8e8e8',
        borderRadius: 8,
        overflow: 'hidden',
    },
    th: {
        background: '#1890ff',
        color: 'white',
        padding: '10px 12px',
        textAlign: 'left',
        fontWeight: 600,
        fontSize: 13,
        borderBottom: '2px solid #096dd9',
    },
    td: {
        padding: '8px 12px',
        borderBottom: '1px solid #f0f0f0',
        fontSize: 13,
    },
    trEven: {
        background: '#fafafa',
    },
    trOdd: {
        background: 'white',
    },
    h3: {
        color: '#1890ff',
        borderBottom: '2px solid #1890ff',
        paddingBottom: 6,
        marginTop: 16,
        marginBottom: 12,
        fontSize: 16,
    },
    h4: {
        color: '#722ed1',
        marginTop: 12,
        marginBottom: 8,
        fontSize: 14,
    },
    strong: {
        color: '#262626',
    },
    ul: {
        paddingLeft: 20,
        margin: '8px 0',
    },
    li: {
        marginBottom: 4,
        lineHeight: 1.8,
    },
    p: {
        margin: '6px 0',
        lineHeight: 1.8,
    },
    code: {
        background: '#f5f5f5',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 12,
        color: '#d63384',
        fontFamily: 'monospace',
    },
    blockquote: {
        borderLeft: '4px solid #1890ff',
        paddingLeft: 12,
        margin: '12px 0',
        color: '#595959',
        background: '#f0f5ff',
        padding: '8px 12px',
        borderRadius: '0 6px 6px 0',
    },
};

// ================================
// COMPONENT RENDER MARKDOWN ĐẸP
// ================================
const MarkdownRenderer = ({ content }) => {
    let rowIndex = 0;

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                // Bảng đẹp
                table: ({ children }) => (
                    <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                        <table style={markdownStyles.table}>
                            {children}
                        </table>
                    </div>
                ),
                thead: ({ children }) => (
                    <thead>{children}</thead>
                ),
                tbody: ({ children }) => {
                    rowIndex = 0;
                    return <tbody>{children}</tbody>;
                },
                tr: ({ children, isHeader }) => {
                    if (isHeader) return <tr>{children}</tr>;
                    rowIndex++;
                    return (
                        <tr style={rowIndex % 2 === 0 ? markdownStyles.trEven : markdownStyles.trOdd}>
                            {children}
                        </tr>
                    );
                },
                th: ({ children }) => (
                    <th style={markdownStyles.th}>{children}</th>
                ),
                td: ({ children }) => {
                    const text = String(children);
                    // Tô màu cho trạng thái
                    if (text.includes('HẾT HẠN')) {
                        return <td style={{ ...markdownStyles.td, color: '#f5222d', fontWeight: 600 }}>{children}</td>;
                    }
                    if (text.includes('KHẨN CẤP')) {
                        return <td style={{ ...markdownStyles.td, color: '#fa8c16', fontWeight: 600 }}>{children}</td>;
                    }
                    if (text.includes('CẢNH BÁO')) {
                        return <td style={{ ...markdownStyles.td, color: '#faad14', fontWeight: 600 }}>{children}</td>;
                    }
                    if (text.includes('OK') || text.includes('Hết hàng') === false) {
                        return <td style={markdownStyles.td}>{children}</td>;
                    }
                    return <td style={markdownStyles.td}>{children}</td>;
                },

                // Heading đẹp
                h1: ({ children }) => (
                    <h1 style={{ color: '#1890ff', fontSize: 20, marginBottom: 12, borderBottom: '3px solid #1890ff', paddingBottom: 8 }}>
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2 style={{ color: '#1890ff', fontSize: 18, marginBottom: 10, marginTop: 16 }}>
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3 style={markdownStyles.h3}>{children}</h3>
                ),
                h4: ({ children }) => (
                    <h4 style={markdownStyles.h4}>{children}</h4>
                ),

                // Text
                p: ({ children }) => (
                    <p style={markdownStyles.p}>{children}</p>
                ),
                strong: ({ children }) => (
                    <strong style={markdownStyles.strong}>{children}</strong>
                ),

                // List đẹp
                ul: ({ children }) => (
                    <ul style={markdownStyles.ul}>{children}</ul>
                ),
                ol: ({ children }) => (
                    <ol style={{ ...markdownStyles.ul, listStyleType: 'decimal' }}>{children}</ol>
                ),
                li: ({ children }) => (
                    <li style={markdownStyles.li}>{children}</li>
                ),

                // Code
                code: ({ inline, children }) => {
                    if (inline) {
                        return <code style={markdownStyles.code}>{children}</code>;
                    }
                    return (
                        <pre style={{
                            background: '#f5f5f5',
                            padding: 12,
                            borderRadius: 6,
                            overflow: 'auto',
                            fontSize: 12,
                            border: '1px solid #e8e8e8',
                        }}>
                            <code>{children}</code>
                        </pre>
                    );
                },

                // Blockquote
                blockquote: ({ children }) => (
                    <blockquote style={markdownStyles.blockquote}>
                        {children}
                    </blockquote>
                ),

                // Link
                a: ({ href, children }) => (
                    <a href={href} style={{ color: '#1890ff' }} target="_blank" rel="noopener noreferrer">
                        {children}
                    </a>
                ),

                // Horizontal rule
                hr: () => (
                    <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '16px 0' }} />
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

// ================================
// COMPONENT CHÍNH: MEDGPT CHAT
// ================================
const MedGPTChat = () => {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            content:
                '### 🤖 Xin chào! Tôi là **MedGPT**\n\n' +
                'Trợ lý AI quản lý chuỗi nhà thuốc. Tôi có thể giúp bạn:\n\n' +
                '| Chức năng | Ví dụ câu hỏi |\n' +
                '|---|---|\n' +
                '| 💊 Thông tin thuốc | "Paracetamol công dụng gì?" |\n' +
                '| 📦 Tra cứu tồn kho | "Panadol còn bao nhiêu viên?" |\n' +
                '| 🔄 Thuốc thay thế | "Tìm thuốc thay thế cho Paracetamol" |\n' +
                '| ⚠️ Thuốc hết hạn | "Thuốc nào sắp hết hạn?" |\n' +
                '| 🏷️ Mã thuốc | "Giải thích mã ANP-PAR-TAB-500MG-GSK-001" |\n' +
                '| 🛒 Tạo đơn hàng | "Tạo đơn 20 viên Panadol tại cửa hàng 1" |\n' +
                '| 🏪 Cửa hàng | "Danh sách cửa hàng" |\n\n' +
                '> Hãy hỏi tôi bất cứ điều gì! 😊',
            intent: 'welcome',
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(`session_${Date.now()}`);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        const text = inputValue.trim();
        if (!text || loading) return;

        const userMsg = { role: 'user', content: text };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue('');
        setLoading(true);

        try {
            const result = await chatWithMedGPT(text, sessionId);
            const botMsg = {
                role: 'bot',
                content: result.response,
                intent: result.intent,
                drugFound: result.drug_found,
                actionResult: result.action_result,
                success: result.success,
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (error) {
            const errMsg = {
                role: 'bot',
                content: '### ❌ Lỗi kết nối\n\nKhông thể kết nối tới server. Hãy kiểm tra backend đang chạy tại `http://localhost:8000`',
                intent: 'error',
            };
            setMessages((prev) => [...prev, errMsg]);
        }

        setLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        setMessages([{
            role: 'bot',
            content: '### 🔄 Chat đã được làm mới\n\nTôi có thể giúp gì cho bạn?',
            intent: 'welcome',
        }]);
    };

    const quickActions = [
        { label: '💊 Paracetamol', msg: 'Paracetamol có công dụng gì?' },
        { label: '📦 Tồn kho', msg: 'Panadol còn bao nhiêu viên?' },
        { label: '🔄 Thay thế', msg: 'Tìm thuốc thay thế cho Paracetamol' },
        { label: '⚠️ Hết hạn', msg: 'Thuốc nào sắp hết hạn cần thanh lý?' },
        { label: '🏷️ Mã thuốc', msg: 'Giải thích mã thuốc ANP-PAR-TAB-500MG-GSK-001' },
        { label: '🏪 Cửa hàng', msg: 'Danh sách cửa hàng' },
    ];

    const getIntentColor = (intent) => {
        const colors = {
            drug_info: 'blue', inventory: 'green', substitute: 'orange',
            expiry: 'red', drug_code: 'purple', create_order: 'cyan',
            store_info: 'geekblue', general: 'default', welcome: 'default', error: 'red',
        };
        return colors[intent] || 'default';
    };

    const getIntentLabel = (intent) => {
        const labels = {
            drug_info: '💊 Thông tin thuốc', inventory: '📦 Tồn kho',
            substitute: '🔄 Thuốc thay thế', expiry: '⚠️ Hết hạn',
            drug_code: '🏷️ Mã thuốc', create_order: '🛒 Đơn hàng',
            store_info: '🏪 Cửa hàng', general: '💬 Chung',
            welcome: '👋 Chào mừng', error: '❌ Lỗi',
        };
        return labels[intent] || intent;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Header */}
            <div style={{
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <MedicineBoxOutlined style={{ fontSize: 28, marginRight: 12 }} />
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 'bold' }}>MedGPT</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>Trợ lý AI Quản lý Chuỗi Nhà Thuốc</div>
                    </div>
                </div>
                <Button icon={<DeleteOutlined />} onClick={handleClear} ghost size="small">
                    Làm mới
                </Button>
            </div>

            {/* Quick Actions */}
            <div style={{
                padding: '10px 16px',
                background: 'white',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                borderBottom: '1px solid #f0f0f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            }}>
                <span style={{ color: '#999', fontSize: 12, lineHeight: '24px', marginRight: 4 }}>
                    Gợi ý:
                </span>
                {quickActions.map((action, idx) => (
                    <Tag
                        key={idx}
                        style={{
                            cursor: 'pointer',
                            borderRadius: 16,
                            padding: '2px 12px',
                            transition: 'all 0.3s',
                        }}
                        color="blue"
                        onClick={() => setInputValue(action.msg)}
                    >
                        {action.label}
                    </Tag>
                ))}
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 24px',
                background: '#f5f7fa',
            }}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: 20,
                        }}
                    >
                        {/* Avatar bot */}
                        {msg.role === 'bot' && (
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                                flexShrink: 0,
                                marginTop: 4,
                            }}>
                                <RobotOutlined style={{ color: 'white', fontSize: 18 }} />
                            </div>
                        )}

                        <div style={{
                            maxWidth: msg.role === 'user' ? '70%' : '85%',
                            padding: msg.role === 'user' ? '10px 16px' : '16px 20px',
                            borderRadius: msg.role === 'user'
                                ? '18px 18px 4px 18px'
                                : '4px 18px 18px 18px',
                            background: msg.role === 'user'
                                ? 'linear-gradient(135deg, #1890ff, #096dd9)'
                                : 'white',
                            color: msg.role === 'user' ? 'white' : '#333',
                            boxShadow: msg.role === 'user'
                                ? '0 2px 8px rgba(24,144,255,0.3)'
                                : '0 2px 8px rgba(0,0,0,0.06)',
                        }}>
                            {/* Header tin nhắn bot */}
                            {msg.role === 'bot' && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: 8,
                                    paddingBottom: 8,
                                    borderBottom: '1px solid #f0f0f0',
                                }}>
                                    <Text strong style={{ fontSize: 13, color: '#722ed1' }}>
                                        MedGPT
                                    </Text>
                                    {msg.intent && (
                                        <Tag
                                            color={getIntentColor(msg.intent)}
                                            style={{ marginLeft: 8, fontSize: 11, borderRadius: 10 }}
                                        >
                                            {getIntentLabel(msg.intent)}
                                        </Tag>
                                    )}
                                </div>
                            )}

                            {/* Header tin nhắn user */}
                            {msg.role === 'user' && (
                                <div style={{ marginBottom: 4 }}>
                                    <UserOutlined style={{ marginRight: 6 }} />
                                    <Text strong style={{ color: 'white', fontSize: 13 }}>Bạn</Text>
                                </div>
                            )}

                            {/* Nội dung */}
                            <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                                {msg.role === 'bot' ? (
                                    <MarkdownRenderer content={msg.content} />
                                ) : (
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                )}
                            </div>

                            {/* Action result */}
                            {msg.actionResult && (
                                <div style={{
                                    marginTop: 12,
                                    padding: '10px 14px',
                                    background: 'linear-gradient(135deg, #f6ffed, #e8f8e0)',
                                    borderRadius: 8,
                                    border: '1px solid #b7eb8f',
                                }}>
                                    <Text strong style={{ color: '#52c41a', fontSize: 13 }}>
                                        ✅ {msg.actionResult.type === 'order_created'
                                            ? `Đơn hàng ${msg.actionResult.order_code} đã tạo - Tổng: ${msg.actionResult.total?.toLocaleString()}đ`
                                            : JSON.stringify(msg.actionResult)}
                                    </Text>
                                </div>
                            )}
                        </div>

                        {/* Avatar user */}
                        {msg.role === 'user' && (
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #1890ff, #096dd9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginLeft: 10,
                                flexShrink: 0,
                                marginTop: 4,
                            }}>
                                <UserOutlined style={{ color: 'white', fontSize: 16 }} />
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', marginBottom: 20 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginRight: 10,
                        }}>
                            <RobotOutlined style={{ color: 'white', fontSize: 18 }} />
                        </div>
                        <div style={{
                            padding: '14px 20px',
                            borderRadius: '4px 18px 18px 18px',
                            background: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <Spin size="small" />
                            <span style={{ color: '#999', fontSize: 13 }}>
                                MedGPT đang phân tích và trả lời...
                            </span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: '12px 24px',
                background: 'white',
                borderTop: '1px solid #e8e8e8',
                display: 'flex',
                gap: 10,
                boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
            }}>
                <TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập câu hỏi... VD: Paracetamol còn bao nhiêu viên ở cửa hàng 1?"
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    style={{
                        borderRadius: 24,
                        paddingLeft: 20,
                        paddingRight: 20,
                        fontSize: 14,
                        border: '2px solid #e8e8e8',
                        transition: 'border-color 0.3s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1890ff'}
                    onBlur={(e) => e.target.style.borderColor = '#e8e8e8'}
                    disabled={loading}
                />
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSend}
                    loading={loading}
                    style={{
                        borderRadius: 24,
                        height: 44,
                        width: 44,
                        minWidth: 44,
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(102,126,234,0.4)',
                    }}
                />
            </div>
        </div>
    );
};

export default MedGPTChat;