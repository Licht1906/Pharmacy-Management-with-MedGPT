import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8000/api',
    timeout: 30000,
});

// MedGPT Chat API

export const chatWithMedGPT = async (message, sessionId = 'default') => {
    const response = await API.post('/medgpt/chat', { 
        message : message, 
        sessionId: sessionId 
    });
    return response.data;
};

//orders API

export const createOrder = async (orderData) => {
    const response = await API.post('/orders', orderData);
    return response.data;
};

export const getOrders = async (storeId = null) => {
    const params = storeId ? { store_id : storeId } : {};
    const response = await API.get('/orders/list', { params });
    return response.data;
};

export const getOrderDetail = async (orderId) => {
    const response = await API.get(`/orders/${orderId}`);
    return response.data;
};

// drug API

export const searchDrugs = async (name) => {
    const response = await API.get('drugs/search', {params: { name}});
    return response.data;
};

export const getDrugInfo = async (name) => {
    const response = await API.get('drugs/info', {params: { name}});
    return response.data;
}

export const findSubstitutes = async (name) => {
    const response = await API.get('drugs/substitutes', {params: { name}});
    return response.data;
}

// disposal API

export const getDisposalReport = async (storeId = null, days = 90) => {
    const params = {days};
    if (storeId) params.store_id = storeId;
    const response = await API.get('/disposal/report', { params });
    return response.data;
}

// ================================
// Login API
// ================================
export const login = async (username, password) => {
    const response = await API.post('/manage/login', { username, password });
    return response.data;
};

// ================================
// Dashboard API
// ================================
export const getDashboard = async () => {
    const response = await API.get('/manage/dashboard');
    return response.data;
};

// ================================
// Manage APIs (CRUD)
// ================================

// Thuốc gốc
export const getGenericDrugs = async () => {
    const response = await API.get('/manage/generic-drugs');
    return response.data;
};
export const createGenericDrug = async (data) => {
    const response = await API.post('/manage/generic-drugs', data);
    return response.data;
};
export const updateGenericDrug = async (id, data) => {
    const response = await API.put(`/manage/generic-drugs/${id}`, data);
    return response.data;
};
export const deleteGenericDrug = async (id) => {
    const response = await API.delete(`/manage/generic-drugs/${id}`);
    return response.data;
};

// Biệt dược
export const getBrandDrugs = async () => {
    const response = await API.get('/manage/brand-drugs');
    return response.data;
};
export const createBrandDrug = async (data) => {
    const response = await API.post('/manage/brand-drugs', data);
    return response.data;
};

// Nhà sản xuất
export const getManufacturers = async () => {
    const response = await API.get('/manage/manufacturers');
    return response.data;
};
export const createManufacturer = async (data) => {
    const response = await API.post('/manage/manufacturers', data);
    return response.data;
};

// Cửa hàng
export const getStores = async () => {
    const response = await API.get('/manage/stores');
    return response.data;
};
export const createStore = async (data) => {
    const response = await API.post('/manage/stores', data);
    return response.data;
};

// Nhân viên
export const getEmployees = async () => {
    const response = await API.get('/manage/employees');
    return response.data;
};
export const createEmployee = async (data) => {
    const response = await API.post('/manage/employees', data);
    return response.data;
};

// Tồn kho
export const getInventory = async (storeId = null) => {
    const params = storeId ? { store_id: storeId } : {};
    const response = await API.get('/manage/inventory', { params });
    return response.data;
};
export const importInventory = async (data) => {
    const response = await API.post('/manage/inventory/import', data);
    return response.data;
};

// Giá thuốc
export const getPrices = async () => {
    const response = await API.get('/manage/prices');
    return response.data;
};
export const createPrice = async (data) => {
    const response = await API.post('/manage/prices', data);
    return response.data;
};

export default API;
