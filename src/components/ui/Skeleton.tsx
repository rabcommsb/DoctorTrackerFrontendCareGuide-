import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'rect' | 'circle';
}

export function Skeleton({
  variant = 'line',
  className = '',
  ...props
}: SkeletonProps) {
  const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
    line: 'h-4 w-full rounded-md',
    rect: 'h-24 w-full rounded-xl',
    circle: 'h-10 w-10 rounded-full shrink-0',
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-slate-200/80 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
