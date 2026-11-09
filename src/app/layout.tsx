import React from 'react';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/lib/query-provider';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata = {
  title: 'doctor-tracker-web — Clinical Operations & Physician Registry',
  description:
    'Next.js App Router clinical frontend for tracking doctors, patients, and appointments via REST API.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryProvider>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            className: 'font-sans text-sm',
          }}
        />
      </AuthProvider>
    </QueryProvider>
  );
}
