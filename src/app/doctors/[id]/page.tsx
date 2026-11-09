'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { DoctorDetailView } from '@/components/doctors/DoctorDetailView';

export default function DoctorDetailPage() {
  const params = useParams<{ id: string }>();
  const doctorId = params?.id || 'doc-101';

  return (
    <ProtectedRoute>
      <AppShell sectionLabel="Doctors" title={`Physician Profile (${doctorId})`}>
        <DoctorDetailView doctorId={doctorId} />
      </AppShell>
    </ProtectedRoute>
  );
}
