'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TOKEN_STORAGE_KEY } from '@/lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard enforcing authentication on protected pages:
 * - Redirects to /login when there is no token in AuthContext / localStorage.
 * - Redirects /login to /dashboard when already authenticated.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const hasStoredToken =
    typeof window !== 'undefined' && Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));

  useEffect(() => {
    if (isLoading) return;

    const authed = isAuthenticated || hasStoredToken;

    if (!authed && pathname !== '/login') {
      router.replace('/login');
    } else if (authed && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, hasStoredToken, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Verifying clinical session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !hasStoredToken && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
