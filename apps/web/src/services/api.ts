import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          useAuthStore.getState().setTokens(accessToken, newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  googleAuth: async (credential: string, googleId: string, email: string, name: string, avatarUrl?: string) => {
    const response = await api.post('/auth/google', { 
      credential, 
      googleId, 
      email, 
      name, 
      avatarUrl 
    });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  logout: async () => {
    await api.post('/auth/logout');
  },
};

// Portfolio API
export const portfolioApi = {
  getPortfolio: async (sort?: string, order?: string) => {
    const response = await api.get('/portfolio', { params: { sort, order } });
    return response.data;
  },
  getItem: async (id: string) => {
    const response = await api.get(`/portfolio/${id}`);
    return response.data;
  },
  addItem: async (data: {
    symbol: string;
    assetType: string;
    quantity: number;
    price: number;
    purchaseDate?: string;
    fees?: number;
    notes?: string;
  }) => {
    const response = await api.post('/portfolio', data);
    return response.data;
  },
  addTransaction: async (id: string, data: {
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
    date?: string;
    fees?: number;
    notes?: string;
  }) => {
    const response = await api.post(`/portfolio/${id}/transactions`, data);
    return response.data;
  },
  updateItem: async (id: string, data: { notes?: string; color?: string }) => {
    const response = await api.put(`/portfolio/${id}`, data);
    return response.data;
  },
  deleteItem: async (id: string) => {
    await api.delete(`/portfolio/${id}`);
  },
};

// Watchlist API
export const watchlistApi = {
  getWatchlist: async (sort?: string, order?: string, filter?: string) => {
    const response = await api.get('/watchlist', { params: { sort, order, filter } });
    return response.data;
  },
  getItem: async (id: string) => {
    const response = await api.get(`/watchlist/${id}`);
    return response.data;
  },
  addItem: async (data: { symbol: string; assetType: string; notes?: string }) => {
    const response = await api.post('/watchlist', data);
    return response.data;
  },
  refreshAnalysis: async (id: string) => {
    const response = await api.post(`/watchlist/${id}/analyze`);
    return response.data;
  },
  removeItem: async (id: string) => {
    await api.delete(`/watchlist/${id}`);
  },
};

// Alerts API
export const alertsApi = {
  getAlerts: async (status?: string) => {
    const response = await api.get('/alerts', { params: { status } });
    return response.data;
  },
  createAlert: async (data: {
    symbol: string;
    assetType?: string;
    alertType: string;
    targetPrice?: number;
    isRecurring?: boolean;
  }) => {
    const response = await api.post('/alerts', data);
    return response.data;
  },
  updateAlert: async (id: string, data: {
    targetPrice?: number;
    isActive?: boolean;
    isRecurring?: boolean;
  }) => {
    const response = await api.put(`/alerts/${id}`, data);
    return response.data;
  },
  deleteAlert: async (id: string) => {
    await api.delete(`/alerts/${id}`);
  },
  getHistory: async (limit?: number, offset?: number) => {
    const response = await api.get('/alerts/history', { params: { limit, offset } });
    return response.data;
  },
};

// Market API
export const marketApi = {
  getOverview: async () => {
    const response = await api.get('/market/overview');
    return response.data;
  },
  search: async (query: string) => {
    const response = await api.get('/market/search', { params: { q: query } });
    return response.data;
  },
  getQuote: async (symbol: string) => {
    const response = await api.get(`/market/quote/${symbol}`);
    return response.data;
  },
  getHistory: async (symbol: string, range?: string) => {
    const response = await api.get(`/market/history/${symbol}`, { params: { range } });
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },
  updateSettings: async (data: Partial<{
    currency: string;
    timezone: string;
    theme: string;
    notifications: {
      email?: boolean;
      dailySummary?: boolean;
      weeklyReport?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      minConfidenceAlert?: number;
    };
  }>) => {
    const response = await api.put('/settings', data);
    return response.data;
  },
  deleteAccount: async () => {
    await api.delete('/settings/account');
  },
};
