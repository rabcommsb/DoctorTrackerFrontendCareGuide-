'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export const ErrorState = React.memo(function ErrorState({
  title = 'Unable to load clinical data',
  description,
  message,
  onRetry,
  isRetrying = false,
  className = '',
}: ErrorStateProps) {
  const resolvedMessage =
    message ||
    description ||
    'A network or server error occurred while fetching data from the REST API. Please try again.';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`py-12 px-6 text-center flex flex-col items-center justify-center space-y-3 bg-white border border-red-200 rounded-xl ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{resolvedMessage}</p>
      </div>
      {onRetry && (
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            isLoading={isRetrying}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            aria-label="Retry loading data"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
});
