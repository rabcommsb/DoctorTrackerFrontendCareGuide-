'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

interface AppShellProps {
  title: string;
  sectionLabel: string;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  title,
  sectionLabel,
  primaryAction,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Close mobile drawer automatically on route transitions
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // Allow closing mobile drawer with Escape key
  useEffect(() => {
    if (!isMobileDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawerOpen]);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        isOpenMobile={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={title}
          sectionLabel={sectionLabel}
          primaryAction={primaryAction}
          onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto space-y-8 transition-opacity duration-150">
          {children}
        </main>
      </div>
    </div>
  );
}
