import React, { memo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type {
  PatientsPerDoctorPoint,
  PatientsOverTimePoint,
  ConditionBreakdownPoint,
  DoctorsAddedPerWeekPoint,
} from '@/types';
import { Card } from '@/components/ui';

export const DONUT_PALETTE = [
  '#4f46e5', // indigo-600
  '#6366f1', // indigo-500
  '#0ea5e9', // sky-500
  '#0d9488', // teal-600
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#64748b', // slate-500
  '#ec4899', // pink-500
];

function formatDateTick(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

export interface StatCardProps {
  label: string;
  value: string | number;
  sublabel: string;
  badgeText?: string;
  badgeClassName?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const StatCard = memo(function StatCard({
  label,
  value,
  sublabel,
  badgeText,
  badgeClassName = 'text-indigo-600',
  icon: Icon,
}: StatCardProps) {
  return (
    <Card className="p-5 sm:p-6 space-y-3">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{label}</span>
        <Icon className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
          {value}
        </span>
        {badgeText && (
          <span className={`text-xs font-medium ${badgeClassName}`}>
            {badgeText}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">{sublabel}</p>
    </Card>
  );
});

export const PatientsPerDoctorChart = memo(function PatientsPerDoctorChart({
  data,
}: {
  data: PatientsPerDoctorPoint[];
}) {
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Horizontal bar chart of patients per doctor"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            horizontal={false}
          />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <YAxis
            dataKey="doctorName"
            type="category"
            width={130}
            tick={{ fontSize: 12, fill: '#334155' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
            }}
            formatter={(val) => [`${val ?? 0} patients`, 'Caseload']}
          />
          <Bar
            dataKey="count"
            name="Patients"
            fill="#4f46e5"
            radius={[0, 4, 4, 0]}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export const PatientsOverTimeChart = memo(function PatientsOverTimeChart({
  data,
}: {
  data: PatientsOverTimePoint[];
}) {
  const formattedData = React.useMemo(
    () =>
      data.map((pt) => ({
        ...pt,
        label: formatDateTick(pt.date),
      })),
    [data]
  );

  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Area chart of patients registered over time"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 8, right: 16, left: -12, bottom: 4 }}
        >
          <defs>
            <linearGradient
              id="patientsOverTimeGrad"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
            }}
            formatter={(val) => [`${val ?? 0} patients`, 'Patients Added']}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="Patients"
            stroke="#4f46e5"
            strokeWidth={2.25}
            fillOpacity={1}
            fill="url(#patientsOverTimeGrad)"
            activeDot={{
              r: 5,
              fill: '#4f46e5',
              stroke: '#ffffff',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export const ConditionBreakdownChart = memo(function ConditionBreakdownChart({
  data,
}: {
  data: ConditionBreakdownPoint[];
}) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center h-auto sm:h-72"
      role="img"
      aria-label="Donut chart of patient condition breakdown"
    >
      <div className="sm:col-span-6 h-56 sm:h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="condition"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={84}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.condition}
                  fill={DONUT_PALETTE[index % DONUT_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
              }}
              formatter={(val, name) => [
                `${val ?? 0} patients`,
                String(name ?? 'Condition'),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Table with Tabular Numerals */}
      <div className="sm:col-span-6 space-y-2 max-h-60 overflow-y-auto pr-1">
        {data.map((item, idx) => (
          <div
            key={item.condition}
            className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-100 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{
                  backgroundColor: DONUT_PALETTE[idx % DONUT_PALETTE.length],
                }}
                aria-hidden="true"
              />
              <span
                className="text-slate-700 font-medium truncate"
                title={item.condition}
              >
                {item.condition}
              </span>
            </div>
            <div className="font-mono tabular-nums text-slate-600 shrink-0">
              <span className="font-semibold text-slate-900">{item.count}</span>{' '}
              <span className="text-slate-400">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const DoctorsAddedPerWeekChart = memo(function DoctorsAddedPerWeekChart({
  data,
}: {
  data: DoctorsAddedPerWeekPoint[];
}) {
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Bar chart of doctors added per week"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: -16, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
            }}
            formatter={(val) => [`${val ?? 0} doctors`, 'Onboarded']}
          />
          <Bar
            dataKey="count"
            name="Doctors Added"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
