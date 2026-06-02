import axios from 'axios';
import { clearSession } from '../utils/authStorage';

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';
const CSRF_COOKIE_NAME = 'umbral_csrf_token';
const SAFE_METHODS = new Set(['get', 'head', 'options']);
const CSRF_HEADER_NAME = 'X-CSRF-Token';

function getCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return '';
  }

  const cookie = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) {
    return '';
  }

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
}

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

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookieValue(CSRF_COOKIE_NAME);

    if (csrfToken) {
      config.headers = config.headers ?? {};
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  return config;
});

export default api;