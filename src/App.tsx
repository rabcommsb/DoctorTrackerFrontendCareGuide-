/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { usePathname } from 'next/navigation';
import RootLayout from '@/app/layout';
import HomePage from '@/app/page';
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';
import DoctorsPage from '@/app/doctors/page';
import DoctorDetailPage from '@/app/doctors/[id]/page';
import PatientsPage from '@/app/patients/page';

function AppRouterView() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <LoginPage />;
  }

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return <DashboardPage />;
  }

  if (pathname === '/doctors') {
    return <DoctorsPage />;
  }

  if (pathname.startsWith('/doctors/')) {
    return <DoctorDetailPage />;
  }

  if (pathname === '/patients' || pathname.startsWith('/patients/')) {
    return <PatientsPage />;
  }

  if (pathname === '/') {
    return <HomePage />;
  }

  return <DashboardPage />;
}

export default function App() {
  return (
    <RootLayout>
      <AppRouterView />
    </RootLayout>
  );
}
