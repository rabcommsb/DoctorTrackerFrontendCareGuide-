'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TOKEN_STORAGE_KEY } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const hasToken =
      isAuthenticated ||
      (typeof window !== 'undefined' && Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));

    if (hasToken) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        <span>Routing clinical workspace...</span>
      </div>
    </div>
  );
}
