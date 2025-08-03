import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  validateToken: () => api.get('/auth/validate'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
};

// Product API
export const productAPI = {
  getAllProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  searchProducts: (params) => api.get('/products/search', { params }),
  getCategories: () => api.get('/products/categories'),
  getProductsByCategory: (categoryId, params) => 
    api.get(`/products/category/${categoryId}`, { params }),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/orders/cart'),
  addToCart: (item) => api.post('/orders/cart/items', item),
  updateCartItem: (itemId, quantity) => 
    api.put(`/orders/cart/items/${itemId}`, { quantity }),
  removeFromCart: (itemId) => api.delete(`/orders/cart/items/${itemId}`),
  clearCart: () => api.delete('/orders/cart'),
};

// Order API
export const orderAPI = {
  createOrder: (orderData) => api.post('/orders', orderData),
  getUserOrders: (params) => api.get('/orders', { params }),
  getOrderById: (id) => api.get(`/orders/${id}`),
  getOrderTracking: (id) => api.get(`/orders/${id}/tracking`),
  updateOrderStatus: (id, status) => 
    api.put(`/orders/${id}/status`, { status }),
};

// Notification API
export const notificationAPI = {
  sendEmail: (emailData) => api.post('/notifications/email', emailData),
  sendSMS: (smsData) => api.post('/notifications/sms', smsData),
  getUserNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
};

// Dashboard API
export const dashboardAPI = {
  getDashboardStats: () => api.get('/dashboard/stats'),
  getRecentOrders: () => api.get('/dashboard/recent-orders'),
  getPopularProducts: () => api.get('/dashboard/popular-products'),
};

export default api; 