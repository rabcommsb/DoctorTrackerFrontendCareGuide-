'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { PatientsRegistry } from '@/components/patients/PatientsRegistry';

export default function PatientsPage() {
  return (
    <ProtectedRoute>
      <AppShell sectionLabel="Census" title="Patients">
        <PatientsRegistry />
      </AppShell>
    </ProtectedRoute>
  );
}
