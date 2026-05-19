import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

export type User = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  kyc_status: string;
  kyc_rejection_reason?: string | null;
  sharia_mode: boolean;
  wallet_balance: number;
  role: string;
  deposit_ref_code?: string | null;
  created_at?: string;
  risk_tolerance?: 'low' | 'medium' | 'high' | null;
  investment_horizon?: 'short' | 'medium' | 'long' | null;
  investment_goal?: 'preserve' | 'grow' | null;
  profile_completed_at?: string | null;
  payment_method_type?: 'card' | null;
  payment_method_data?: { holder_name: string; last4: string; expiry: string } | null;
};

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
    sharia_mode?: boolean;
  }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'full_name' | 'phone' | 'sharia_mode' | 'payment_method_type' | 'payment_method_data'>>) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('infinder_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!localStorage.getItem('infinder_token')) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/api/auth/me');
      if (data.token) {
        localStorage.setItem('infinder_token', data.token);
        setToken(data.token);
      }
      setUser(data.user);
    } catch {
      localStorage.removeItem('infinder_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('infinder_token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      full_name?: string;
      phone?: string;
      sharia_mode?: boolean;
    }) => {
      const { data } = await api.post('/api/auth/register', payload);
      localStorage.setItem('infinder_token', data.token);
      setToken(data.token);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('infinder_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, 'full_name' | 'phone' | 'sharia_mode' | 'payment_method_type' | 'payment_method_data'>>) => {
      const { data } = await api.patch('/api/auth/me', patch);
      setUser(data.user);
    },
    []
  );

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      register,
      logout,
      refreshMe,
      updateProfile,
    }),
    [token, user, loading, login, register, logout, refreshMe, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
