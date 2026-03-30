import axios from 'axios';
import { getSession } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor request để tự động attach token thực tế từ session
api.interceptors.request.use(
  async (config) => {
    const session: any = await getSession();
    const token = session?.id_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor response xử lý lỗi chuẩn
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Có thể redirect về trang login nếu lỗi 401
    // if (error.response?.status === 401) { signOut(); }
    return Promise.reject(error);
  }
);

export default api;
