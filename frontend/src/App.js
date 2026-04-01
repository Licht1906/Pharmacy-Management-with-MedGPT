import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import MedGPTChat from './components/MedGPTChat';
import OrderForm from './components/OrderForm';
import DrugSubstitute from './components/DrugSubstitute';
import DisposalReport from './components/DisposalReport';
import ManageGenericDrugs from './components/ManageGenericDrugs';
import ManageBrandDrugs from './components/ManageBrandDrugs';
import ManageManufacturers from './components/ManageManufacturers';
import ManageStores from './components/ManageStores';
import ManageEmployees from './components/ManageEmployees';
import ManageInventory from './components/ManageInventory';
import ManagePrices from './components/ManagePrices';
import ManageMedicalSupplies from './components/ManageMedicalSupplies';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('dashboard');

    // Kiểm tra đã login chưa (lưu localStorage)
    useEffect(() => {
        const saved = localStorage.getItem('pharmacy_user');
        if (saved) {
            setUser(JSON.parse(saved));
        }
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('pharmacy_user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('pharmacy_user');
        setCurrentPage('dashboard');
    };

    // Chưa login → hiện trang login
    if (!user) {
        return <LoginPage onLogin={handleLogin} />;
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <Dashboard user={user} />;
            case 'chat': return <MedGPTChat />;
            case 'orders': return <OrderForm />;
            case 'substitute': return <DrugSubstitute />;
            case 'disposal': return <DisposalReport />;
            case 'generic-drugs': return <ManageGenericDrugs />;
            case 'brand-drugs': return <ManageBrandDrugs />;
            case 'manufacturers': return <ManageManufacturers />;
            case 'stores': return <ManageStores />;
            case 'employees': return <ManageEmployees user={user} />;
            case 'inventory': return <ManageInventory />;
            case 'prices': return <ManagePrices />;
            case 'medical-supplies': return <ManageMedicalSupplies />;
            default: return <Dashboard user={user} />;
        }
    };

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                user={user}
                onLogout={handleLogout}
            />
            <div style={{
                marginLeft: 260,
                width: 'calc(100% - 260px)',
                height: '100vh',
                overflow: 'auto',
                background: '#f0f2f5',
            }}>
                {renderPage()}
            </div>
        </div>
    );
}

export default App;