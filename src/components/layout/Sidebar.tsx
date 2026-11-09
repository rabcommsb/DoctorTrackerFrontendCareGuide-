'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  ShieldAlert,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import api, { API_BASE_URL, TOKEN_STORAGE_KEY } from '@/lib/api';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/patients', label: 'Patients', icon: Users },
];

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const isRouteActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleSimulate401Interceptor = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'invalid-or-expired-token');
    }
    try {
      await api.get('/auth/me');
    } catch {
      // Handled by 401 response interceptor in src/lib/api.ts
    }
  };

  const renderSidebarContent = (showCloseButton = false) => (
    <div className="flex flex-col justify-between h-full bg-white text-slate-900 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <span>doctor-tracker-web</span>
          </Link>

          {showCloseButton && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation drawer"
              className="p-2 -mr-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav
          className="p-4 space-y-1.5"
          aria-label="Primary Clinical Navigation"
        >
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                    active
                      ? 'text-indigo-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Endpoint Metadata & 401 Test Utility */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="px-2 space-y-1">
          <p className="text-xs font-medium text-slate-400">External REST API</p>
          <p
            className="text-xs font-mono text-slate-600 truncate"
            title={API_BASE_URL}
          >
            {API_BASE_URL}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSimulate401Interceptor}
          className="w-full inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer text-left"
          title="Simulates an expired Bearer token to test 401 redirect to /login"
        >
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Simulate 401 Redirect</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col border-r border-slate-200 bg-white">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-In Drawer & Backdrop */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${
          isOpenMobile
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpenMobile}
      >
        {/* Backdrop Scrim */}
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-200"
        />

        {/* Slide-in Drawer Panel */}
        <aside
          aria-label="Mobile Navigation Drawer"
          className={`fixed inset-y-0 left-0 z-10 w-72 max-w-[85vw] bg-white border-r border-slate-200 shadow-xl transform transition-transform duration-200 ease-out ${
            isOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>
    </>
  );
}
