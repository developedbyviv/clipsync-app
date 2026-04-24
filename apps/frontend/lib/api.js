import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  withCredentials: true, // Required: sends httpOnly cookie on cross-origin requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor: normalise errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Network error';
    const code = error.response?.data?.code || 'UNKNOWN_ERROR';
    const statusCode = error.response?.status || 0;

    return Promise.reject({ message, code, statusCode });
  }
);

export default api;
