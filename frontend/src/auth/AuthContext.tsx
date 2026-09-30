import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { UserRead, UserRegister, LoginRequest, TokenResponse, ChangePasswordRequest } from '../types';
import { setAccessToken, clearAccessToken, setOnTokenCleared, getAuthGeneration, nextAuthGeneration } from './tokenStore';

export interface AuthState {
  user: UserRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: UserRegister) => Promise<UserRead>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// In-flight mutex to prevent duplicate refresh calls during startup (e.g. React StrictMode)
let restorePromise: Promise<{ user: UserRead | null; generation: number } | null> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize React state whenever token is cleared by Axios transport (e.g. background 401 refresh failure)
  useEffect(() => {
    setOnTokenCleared(() => {
      setUser(null);
    });
    return () => {
      setOnTokenCleared(null);
    };
  }, []);

  // Startup session restoration on mount
  useEffect(() => {
    let isMounted = true;
    const currentGen = getAuthGeneration();

    const restoreSession = async () => {
      if (!restorePromise) {
        const gen = currentGen;
        restorePromise = (async () => {
          try {
            const response = await api.post<TokenResponse>('/auth/refresh');
            if (gen === getAuthGeneration()) {
              setAccessToken(response.data.access_token);
            }
            return { user: response.data.user, generation: gen };
          } catch {
            // Expected for unauthenticated visitors (e.g. 401 missing cookie) or network errors
            if (gen === getAuthGeneration()) {
              clearAccessToken();
            }
            return null;
          } finally {
            restorePromise = null;
          }
        })();
      }

      try {
        const result = await restorePromise;
        if (isMounted && result && result.generation === getAuthGeneration()) {
          setUser(result.user);
        }
      } finally {
        if (isMounted && currentGen === getAuthGeneration()) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const loginGen = nextAuthGeneration();
    const payload: LoginRequest = { email, password };
    const response = await api.post<TokenResponse>('/auth/login', payload);
    if (loginGen === getAuthGeneration()) {
      setAccessToken(response.data.access_token);
      setUser(response.data.user);
      setIsLoading(false);
    }
  };

  const register = async (data: UserRegister): Promise<UserRead> => {
    const response = await api.post<UserRead>('/auth/register', data);
    // Backend registration returns 201 UserRead without issuing credentials.
    // Client remains unauthenticated until explicit login.
    return response.data;
  };

  const logout = async (): Promise<void> => {
    const logoutGen = nextAuthGeneration();
    // Clear local auth state immediately so the client is instantaneously anonymous
    clearAccessToken();
    setUser(null);
    setIsLoading(false);

    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed on server:', err);
    } finally {
      // Only enforce local state clearance if this logout is still the current generation
      if (logoutGen === getAuthGeneration()) {
        clearAccessToken();
        setUser(null);
        setIsLoading(false);
      }
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const payload: ChangePasswordRequest = {
      current_password: currentPassword,
      new_password: newPassword,
    };
    await api.post('/auth/change-password', payload);
    // Password change increments token_version and invalidates refresh sessions server-side.
    // Invalidate in-flight operations and clear local session immediately.
    nextAuthGeneration();
    clearAccessToken();
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
