'use client';

import React from 'react';
import { LogOut, Menu, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

interface TopBarProps {
  title: string;
  sectionLabel: string;
  onOpenMobileMenu: () => void;
  primaryAction?: React.ReactNode;
}

export function TopBar({
  title,
  sectionLabel,
  onOpenMobileMenu,
  primaryAction,
}: TopBarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left Zone: Mobile Hamburger Button + Breadcrumb Trail */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 transition-colors duration-150 cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm truncate">
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap">
            {sectionLabel}
          </span>
          <span
            className="hidden sm:inline text-slate-300"
            aria-hidden="true"
          >
            /
          </span>
          <span className="font-semibold text-slate-900 truncate">{title}</span>
        </div>
      </div>

      {/* Right Zone: User Email + Logout Button */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {primaryAction}

        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
          <UserIcon className="w-4 h-4 text-indigo-600 hidden sm:inline shrink-0" />
          <span
            className="font-medium text-slate-700 truncate max-w-[160px] sm:max-w-[240px]"
            title={user?.email || 'admin@doctortracker.io'}
          >
            {user?.email || 'admin@doctortracker.io'}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" aria-hidden="true" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
