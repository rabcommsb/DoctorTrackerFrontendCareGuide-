'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Loader2,
  RefreshCw,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDashboardStats } from '@/hooks/useClinicalData';
import { useAuth } from '@/hooks/useAuth';
import type {
  ConditionBreakdownPoint,
  DashboardRange,
  DoctorsAddedPerWeekPoint,
  PatientsOverTimePoint,
  PatientsPerDoctorPoint,
} from '@/types';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/components/ui';
import {
  ConditionBreakdownChart,
  DoctorsAddedPerWeekChart,
  PatientsOverTimeChart,
  PatientsPerDoctorChart,
  StatCard,
} from './DashboardCharts';

const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
];

export function DashboardOverview() {
  const { user } = useAuth();
  const [range, setRange] = useState<DashboardRange>(30);
  const [simulateEmptyState, setSimulateEmptyState] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useDashboardStats(range);

  const handleRangeChange = useCallback((nextRange: DashboardRange) => {
    setRange(nextRange);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    await refetch();
    toast.success(`Refreshed dashboard stats (${range}-day window)`);
  }, [refetch, range]);

  const patientsPerDoctor: PatientsPerDoctorPoint[] = useMemo(
    () => (simulateEmptyState || !data ? [] : data.patientsPerDoctor),
    [simulateEmptyState, data]
  );

  const patientsOverTime: PatientsOverTimePoint[] = useMemo(
    () => (simulateEmptyState || !data ? [] : data.patientsOverTime),
    [simulateEmptyState, data]
  );

  const conditionBreakdown: ConditionBreakdownPoint[] = useMemo(
    () => (simulateEmptyState || !data ? [] : data.conditionBreakdown),
    [simulateEmptyState, data]
  );

  const doctorsAddedPerWeek: DoctorsAddedPerWeekPoint[] = useMemo(
    () => (simulateEmptyState || !data ? [] : data.doctorsAddedPerWeek),
    [simulateEmptyState, data]
  );

  const totalWindowAdmissions = useMemo(
    () =>
      patientsOverTime.reduce(
        (sum: number, pt: PatientsOverTimePoint) => sum + pt.count,
        0
      ),
    [patientsOverTime]
  );

  const totalWeeklyDoctorsAdded = useMemo(
    () =>
      doctorsAddedPerWeek.reduce(
        (sum: number, pt: DoctorsAddedPerWeekPoint) => sum + pt.count,
        0
      ),
    [doctorsAddedPerWeek]
  );

  // Error State with Retry Button
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Clinical Analytics Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time hospital metrics and caseload breakdown
            </p>
          </div>
        </div>
        <ErrorState
          title="Unable to load dashboard analytics"
          message={
            error instanceof Error
              ? error.message
              : 'Failed to fetch dashboard statistics from /api/dashboard/stats.'
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Loading Skeleton State
  if (isLoading || !data) {
    return (
      <div
        className="space-y-8"
        aria-busy="true"
        aria-label="Loading dashboard statistics"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-2">
            <Skeleton variant="line" className="w-56 sm:w-64 h-7" />
            <Skeleton variant="line" className="w-64 sm:w-80 h-4" />
          </div>
          <Skeleton variant="line" className="w-full sm:w-56 h-10 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((idx) => (
            <Card key={idx} className="p-5 sm:p-6 space-y-3">
              <Skeleton variant="line" className="w-32 h-4" />
              <Skeleton variant="line" className="w-20 h-8" />
              <Skeleton variant="line" className="w-40 h-3" />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((idx) => (
            <Card key={idx} className="p-5 sm:p-6 space-y-4">
              <Skeleton variant="line" className="w-48 h-5" />
              <Skeleton variant="line" className="w-60 h-3.5" />
              <Skeleton variant="rect" className="h-64" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty =
    simulateEmptyState ||
    (data.totalDoctors === 0 &&
      data.totalPatients === 0 &&
      data.patientsPerDoctor.length === 0 &&
      data.patientsOverTime.length === 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header & Range Switcher (7 / 30 / 90 days) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-slate-200">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Clinical Analytics Dashboard
            </h1>
            {isFetching && !isLoading && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600"
                aria-live="polite"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating ({range}d)...</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Attending: {user?.name || 'Dr. Sarah Chen, MD'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              GET /api/dashboard/stats?range={range}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          {/* 7 / 30 / 90 Days Range Switcher */}
          <div
            role="group"
            aria-label="Dashboard Date Range"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200/80 rounded-lg"
          >
            {RANGE_OPTIONS.map((opt) => {
              const active = range === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Show stats for last ${opt.label}`}
                  onClick={() => handleRangeChange(opt.value)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    active
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            isLoading={isFetching}
            aria-label="Refresh dashboard statistics"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <button
            type="button"
            onClick={() => setSimulateEmptyState((prev) => !prev)}
            aria-pressed={simulateEmptyState}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {simulateEmptyState ? 'Show Populated Data' : 'Preview Empty State'}
          </button>
        </div>
      </div>

      {/* Row of 4 Memoized Stat Cards */}
      <section
        aria-label="Summary Statistics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      >
        <StatCard
          label="Total Doctors"
          value={simulateEmptyState ? 0 : data.totalDoctors}
          sublabel="Active physicians in directory"
          icon={Stethoscope}
        />

        <StatCard
          label="Total Patients"
          value={simulateEmptyState ? 0 : data.totalPatients}
          sublabel="Registered across all conditions"
          icon={Users}
        />

        <StatCard
          label="New Doctors This Week"
          value={`+${simulateEmptyState ? 0 : data.newDoctorsThisWeek}`}
          badgeText="Onboarded"
          badgeClassName="text-emerald-700"
          sublabel="Added in the last 7 days"
          icon={UserPlus}
        />

        <StatCard
          label="New Patients This Week"
          value={`+${simulateEmptyState ? 0 : data.newPatientsThisWeek}`}
          badgeText="Admitted"
          badgeClassName="text-indigo-600"
          sublabel="New patient registrations this week"
          icon={UserCheck}
        />
      </section>

      {/* Global Empty State if No Data Exists */}
      {isEmpty ? (
        <Card className="p-6 sm:p-8">
          <EmptyState
            icon={<BarChart3 className="w-5 h-5 text-indigo-600" />}
            title="No clinical analytics data available"
            description="Once doctors and patients are registered in the system, throughput charts, condition breakdowns, and weekly onboarding metrics will populate here."
            actionLabel={
              simulateEmptyState ? 'Restore Live Data' : 'Refresh Dashboard'
            }
            onAction={() =>
              simulateEmptyState ? setSimulateEmptyState(false) : refetch()
            }
          >
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/doctors"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
              >
                Go to Doctors Directory
              </Link>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <Link
                href="/patients"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
              >
                Go to Patients Roster
              </Link>
            </div>
          </EmptyState>
        </Card>
      ) : (
        /* 2x2 Memoized Recharts Grid */
        <section
          aria-label="Clinical Telemetry Charts"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
        >
          {/* 1. Horizontal Bar Chart: Patients per Doctor */}
          <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <CardHeader className="pb-3">
              <div>
                <CardTitle>Patients per Doctor</CardTitle>
                <CardDescription>
                  Active patient caseload distribution by attending physician
                </CardDescription>
              </div>
              <Link
                href="/doctors"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
              >
                View Doctors
              </Link>
            </CardHeader>

            {patientsPerDoctor.length === 0 ? (
              <EmptyState
                title="No doctor caseload data"
                description="Assign patients to doctors to view caseload distribution."
              />
            ) : (
              <PatientsPerDoctorChart data={patientsPerDoctor} />
            )}
          </Card>

          {/* 2. Line / Area Chart: Patients Over Time */}
          <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <CardHeader className="pb-3">
              <div>
                <CardTitle>Patients Over Time ({range} Days)</CardTitle>
                <CardDescription>
                  Patient intake and registration trend over the selected{' '}
                  {range}-day window
                </CardDescription>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                {totalWindowAdmissions} admissions
              </span>
            </CardHeader>

            {patientsOverTime.length === 0 ? (
              <EmptyState
                title="No timeline data for this period"
                description="Select a different date range or register new patients."
              />
            ) : (
              <PatientsOverTimeChart data={patientsOverTime} />
            )}
          </Card>

          {/* 3. Donut Chart: Condition Breakdown */}
          <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <CardHeader className="pb-3">
              <div>
                <CardTitle>Condition Breakdown</CardTitle>
                <CardDescription>
                  Proportional distribution of primary clinical diagnoses across
                  patients
                </CardDescription>
              </div>
              <Link
                href="/patients"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
              >
                View Patients
              </Link>
            </CardHeader>

            {conditionBreakdown.length === 0 ? (
              <EmptyState
                title="No condition data recorded"
                description="Add patient diagnoses to view condition breakdown."
              />
            ) : (
              <ConditionBreakdownChart data={conditionBreakdown} />
            )}
          </Card>

          {/* 4. Bar Chart: Doctors Added per Week */}
          <Card className="p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <CardHeader className="pb-3">
              <div>
                <CardTitle>Doctors Added per Week</CardTitle>
                <CardDescription>
                  Weekly physician onboarding cadence across the {range}-day
                  window
                </CardDescription>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                {totalWeeklyDoctorsAdded} added
              </span>
            </CardHeader>

            {doctorsAddedPerWeek.length === 0 ? (
              <EmptyState
                title="No weekly onboarding data"
                description="Add new doctors to track weekly onboarding cadence."
              />
            ) : (
              <DoctorsAddedPerWeekChart data={doctorsAddedPerWeek} />
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
