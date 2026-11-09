'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { DoctorsDirectory } from '@/components/doctors/DoctorsDirectory';

export default function DoctorsPage() {
  return (
    <ProtectedRoute>
      <AppShell sectionLabel="Directory" title="Doctors">
        <DoctorsDirectory />
      </AppShell>
    </ProtectedRoute>
  );
}
