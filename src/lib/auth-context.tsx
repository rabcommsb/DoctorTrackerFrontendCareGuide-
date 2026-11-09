'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import api, { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '@/lib/api';
import type { AuthResponse, LoginCredentials, User } from '@/types';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (options?: { silent?: boolean }) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const FALLBACK_DEFAULT_USER: User = {
  id: 'usr-clinical-01',
  email: 'admin@doctortracker.io',
  name: 'Dr. Sarah Chen, MD',
  role: 'ADMIN',
  department: 'Clinical Operations & Cardiology',
  licenseNumber: 'MD-90412-CA',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hydrate token & current user from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUserRaw = localStorage.getItem(USER_STORAGE_KEY);

    if (storedToken) {
      setToken(storedToken);
      if (storedUserRaw) {
        try {
          setUser(JSON.parse(storedUserRaw));
        } catch {
          setUser(FALLBACK_DEFAULT_USER);
        }
      } else {
        setUser(FALLBACK_DEFAULT_USER);
      }
    } else {
      setToken(null);
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  // Listen for 401 unauthorized events dispatched by the Axios interceptor
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
      toast.error('Your session has expired (401). Please sign in again.');
      router.replace('/login');
    };

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized);
    };
  }, [router]);

  // Route protection:
  // - All pages except /login redirect to /login when there is no token
  // - /login redirects to /dashboard if logged in
  useEffect(() => {
    if (isLoading) return;

    const hasToken =
      Boolean(token) ||
      (typeof window !== 'undefined' && Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));

    if (!hasToken && pathname !== '/login') {
      router.replace('/login');
    } else if (hasToken && (pathname === '/login' || pathname === '/')) {
      router.replace('/dashboard');
    }
  }, [isLoading, token, pathname, router]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      const { token: receivedToken, user: receivedUser } = response.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(receivedUser));
      }

      setToken(receivedToken);
      setUser(receivedUser);
      toast.success(`Signed in as ${receivedUser.name}`);
      router.replace('/dashboard');
    },
    [router]
  );

  const logout = useCallback(
    (options?: { silent?: boolean }) => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      setToken(null);
      setUser(null);
      if (!options?.silent) {
        toast.info('Signed out of clinical session');
      }
      router.replace('/login');
    },
    [router]
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const response = await api.get<User>('/auth/me');
    setUser(response.data);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data));
    }
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
