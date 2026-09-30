import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { TokenResponse } from './types';
import { getAccessToken, setAccessToken, clearAccessToken, getAuthGeneration } from './auth/tokenStore';

// Type-safe module augmentation for retry and generation tracking
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _authGeneration?: number;
  }
}

// Default to localhost for development if not provided
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Endpoints that should never have Authorization headers automatically attached,
 * and should never trigger token refresh on 401 responses.
 */
function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh')
  );
}

/**
 * Extract the raw token string from a request's Authorization Bearer header, if present.
 */
function getRequestBearerToken(config: InternalAxiosRequestConfig): string | null {
  if (!config.headers) return null;
  const auth = config.headers.Authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length);
  }
  return null;
}

/**
 * Check if a request was sent with a Bearer access token.
 */
function hasBearerToken(config: InternalAxiosRequestConfig): boolean {
  return getRequestBearerToken(config) !== null;
}

// Single-flight refresh mutex scoped to the active auth generation
let refreshPromise: Promise<string> | null = null;
let refreshPromiseGen: number | null = null;

/**
 * Requests a new access token via single-flight refresh mutex.
 * Concurrent callers within the same auth generation share the exact same in-flight Promise.
 */
export async function requestTokenRefresh(): Promise<string> {
  const currentGen = getAuthGeneration();

  if (refreshPromise && refreshPromiseGen === currentGen) {
    return refreshPromise;
  }

  const refreshGen = currentGen;
  refreshPromiseGen = refreshGen;

  refreshPromise = (async () => {
    try {
      const response = await api.post<TokenResponse>('/auth/refresh');
      const newToken = response.data.access_token;
      if (refreshGen !== getAuthGeneration()) {
        throw new Error('Refresh aborted: auth generation changed');
      }
      setAccessToken(newToken);
      return newToken;
    } catch (error) {
      if (refreshGen === getAuthGeneration()) {
        clearAccessToken();
      }
      throw error;
    } finally {
      if (refreshPromiseGen === refreshGen) {
        refreshPromise = null;
        refreshPromiseGen = null;
      }
    }
  })();

  return refreshPromise;
}

// Request interceptor: attach Bearer token from memory store and bind auth generation
api.interceptors.request.use(
  (config) => {
    if (!isAuthEndpoint(config.url)) {
      const token = getAccessToken();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
        config._authGeneration = getAuthGeneration();
      } else if (hasBearerToken(config) && config._authGeneration === undefined) {
        config._authGeneration = getAuthGeneration();
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 with generation check, already-rotated token reuse, and single-flight refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Refresh/retry eligibility check:
    // 1. HTTP 401 Unauthorized
    // 2. Request config exists
    // 3. Request has not already been retried (_retry !== true)
    // 4. Request is not an excluded auth endpoint (login, register, refresh)
    // 5. Request was originally sent with an Authorization Bearer token
    // 6. Request was created under the current active authentication generation
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url) &&
      hasBearerToken(originalRequest) &&
      originalRequest._authGeneration !== undefined &&
      originalRequest._authGeneration === getAuthGeneration()
    ) {
      originalRequest._retry = true;

      const requestToken = getRequestBearerToken(originalRequest);
      const currentToken = getAccessToken();

      // If another request under the same auth generation already refreshed the token,
      // reuse the newer token immediately without performing a redundant refresh round-trip.
      if (currentToken && requestToken && currentToken !== requestToken) {
        originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        originalRequest._authGeneration = getAuthGeneration();
        return api(originalRequest);
      }

      try {
        const newToken = await requestTokenRefresh();
        if (originalRequest._authGeneration !== getAuthGeneration()) {
          return Promise.reject(error);
        }
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest._authGeneration = getAuthGeneration();
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
