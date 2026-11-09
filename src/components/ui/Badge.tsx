import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'indigo'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

/**
 * Clean typographic semantic status label (adheres to zero-pill discipline
 * with crisp inline text and semantic contrast rather than rounded capsule boxes).
 */
export function Badge({
  variant = 'default',
  icon,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    default: 'text-slate-700',
    indigo: 'text-indigo-700 font-semibold',
    success: 'text-emerald-700 font-semibold',
    warning: 'text-amber-700 font-semibold',
    danger: 'text-red-600 font-semibold',
    neutral: 'text-slate-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
