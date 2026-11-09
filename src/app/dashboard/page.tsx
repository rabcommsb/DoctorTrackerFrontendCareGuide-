'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell sectionLabel="Analytics" title="Dashboard">
        <DashboardOverview />
      </AppShell>
    </ProtectedRoute>
  );
}
