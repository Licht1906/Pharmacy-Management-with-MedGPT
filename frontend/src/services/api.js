import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8000/api',
    timeout: 30000,
});

API.interceptors.request.use((config) => {
    const saved = localStorage.getItem('pharmacy_user');
    if (saved) {
        const user = JSON.parse(saved);
        config.headers['X-Role'] = user.role;
        config.headers['X-Store-ID'] = user.store_id;
        config.headers['X-Employee-ID'] = user.employee_id;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
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
    const response = await API.post('/orders/create', orderData);
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

export const searchDrugs = async (name, storeId = null) => {
    const params = storeId ? { name, store_id: storeId } : { name };
    const response = await API.get('drugs/search', { params });
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

export const disposeDrugs = async (inventoryIds) => {
    const response = await API.post('/disposal/dispose', { inventory_ids: inventoryIds });
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
export const updateBrandDrug = async (id, data) => {
    const response = await API.put(`/manage/brand-drugs/${id}`, data);
    return response.data;
};
export const deleteBrandDrug = async (id) => {
    const response = await API.delete(`/manage/brand-drugs/${id}`);
    return response.data;
};

// Upload Image
export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await API.post('/manage/upload-image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
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
export const deleteStore = async (storeId) => {
    const response = await API.delete(`/manage/stores/${storeId}`);
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
export const deleteEmployee = async (employeeId, deletedById) => {
    const response = await API.delete(`/manage/employees/${employeeId}`, { params: { deleted_by_id: deletedById } });
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

// Vật dụng y tế
export const getMedicalSupplies = async (params = {}) => {
    const response = await API.get('/medical-supplies/products', { params });
    return response.data;
};

export const createMedicalSupply = async (data) => {
    const response = await API.post('/medical-supplies/products', data);
    return response.data;
};

export const updateMedicalSupply = async (id, data) => {
    const response = await API.put(`/medical-supplies/products/${id}`, data);
    return response.data;
};

export const deleteMedicalSupply = async (id) => {
    const response = await API.delete(`/medical-supplies/products/${id}`);
    return response.data;
};

export const getProductInventory = async (params = {}) => {
    const response = await API.get('/medical-supplies/inventory', { params });
    return response.data;
};

export const importProductInventory = async (data) => {
    const response = await API.post('/manage/import-product-inventory', data);
    return response.data;
};

export const getProductCategories = async () => {
    const response = await API.get('/medical-supplies/categories');
    return response.data;
};

export default API;
