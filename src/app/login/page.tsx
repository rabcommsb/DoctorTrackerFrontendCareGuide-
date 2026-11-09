'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { Activity, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL, TOKEN_STORAGE_KEY } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid clinical email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: isAuthHydrating } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@doctortracker.com',
      password: 'Admin@12345',
    },
  });

  // Redirect /login to /dashboard if already logged in
  useEffect(() => {
    if (isAuthHydrating) return;
    const hasToken =
      isAuthenticated ||
      (typeof window !== 'undefined' && Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));

    if (hasToken) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isAuthHydrating, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string; error?: string }>;
      const serverMessage =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Authentication failed. Please verify your email and password.';

      toast.error(serverMessage);
    }
  };

  const handleFillDemo = () => {
    setValue('email', 'admin@doctortracker.com', { shouldValidate: true });
    setValue('password', 'Admin@12345', { shouldValidate: true });
  };

  const handleTestErrorToast = async () => {
    setValue('email', 'invalid@doctortracker.io', { shouldValidate: true });
    setValue('password', 'wrongpassword', { shouldValidate: true });
    await handleSubmit(onSubmit)();
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand Identity */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            doctor-tracker-web
          </h1>
          <p className="text-sm text-slate-500">
            Sign in to access physician schedules and patient census
          </p>
        </div>

        {/* Centered Authentication Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-7 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Clinical Portal Sign In
            </h2>
            <p className="text-xs text-slate-500">
              <span>Authenticating via REST API</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono text-slate-600">{API_BASE_URL}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Clinical Email"
              type="email"
              autoComplete="email"
              placeholder="name@doctortracker.io"
              disabled={isSubmitting}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isSubmitting}
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register('password')}
            />

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                leftIcon={!isSubmitting ? <Lock className="w-4 h-4" /> : undefined}
                className="w-full"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>
            </div>
          </form>

          {/* Quick Verification Controls for Demo & Error Toasts */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Quick test actions</span>
              <span className="font-mono">POST /auth/login</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleFillDemo}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Fill Attending Login
              </button>
              <button
                type="button"
                onClick={handleTestErrorToast}
                disabled={isSubmitting}
                className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50/70 hover:bg-red-100/80 border border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Test Error Toast (401)
              </button>
            </div>
          </div>
        </div>

        {/* Footer Security Note */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Bearer JWT stored in localStorage</span>
          <span aria-hidden="true">·</span>
          <span>Auto-redirects on 401</span>
        </div>
      </div>
    </div>
  );
}
