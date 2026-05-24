import axios from 'axios';
import { clearSession } from '../utils/authStorage';

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

const defaultApiUrl =
  typeof window === 'undefined'
    ? 'http://localhost:3001/api/v1'
    : `${window.location.protocol}//${window.location.hostname}:3001/api/v1`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Si el token expiró, redirige al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }
    }
    return Promise.reject(error);
  },
);

export default api;