'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
  accessor?: keyof T;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRowClick?: (row: T) => void;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function getAlignClass(align?: 'left' | 'center' | 'right') {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

interface DesktopRowProps<T> {
  row: T;
  rowIndex: number;
  columns: DataTableColumn<T>[];
  onRowClick?: (row: T) => void;
}

function DesktopRowInner<T>({
  row,
  rowIndex,
  columns,
  onRowClick,
}: DesktopRowProps<T>) {
  return (
    <tr
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={`hover:bg-slate-50/80 transition-colors duration-150 ${
        onRowClick ? 'cursor-pointer' : ''
      }`}
    >
      {columns.map((col) => (
        <td
          key={col.key}
          className={`py-3.5 px-4 lg:px-6 ${getAlignClass(col.align)} ${
            col.className || ''
          }`}
        >
          {col.render
            ? col.render(row, rowIndex)
            : col.accessor
            ? String(row[col.accessor] ?? '')
            : null}
        </td>
      ))}
    </tr>
  );
}

const MemoizedDesktopRow = React.memo(DesktopRowInner) as typeof DesktopRowInner;

interface MobileCardRowProps<T> {
  row: T;
  rowIndex: number;
  columns: DataTableColumn<T>[];
  onRowClick?: (row: T) => void;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
}

function MobileCardRowInner<T>({
  row,
  rowIndex,
  columns,
  onRowClick,
  renderMobileCard,
}: MobileCardRowProps<T>) {
  return (
    <div
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={`p-4 hover:bg-slate-50/80 transition-colors duration-150 ${
        onRowClick ? 'cursor-pointer' : ''
      }`}
    >
      {renderMobileCard ? (
        renderMobileCard(row, rowIndex)
      ) : (
        <div className="space-y-2.5 text-sm">
          {columns.map((col) => (
            <div
              key={col.key}
              className="flex items-start justify-between gap-4"
            >
              <span className="text-xs font-medium text-slate-500 shrink-0">
                {col.header}
              </span>
              <div className="text-right text-slate-900 min-w-0">
                {col.render
                  ? col.render(row, rowIndex)
                  : col.accessor
                  ? String(row[col.accessor] ?? '')
                  : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MemoizedMobileCard = React.memo(
  MobileCardRowInner
) as typeof MobileCardRowInner;

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  isFetching = false,
  isError = false,
  errorMessage,
  onRetry,
  skeletonRows = 5,
  emptyTitle = 'No matching records found',
  emptyDescription = 'Try adjusting your search or filter criteria.',
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
  renderMobileCard,
  footer,
  className = '',
}: DataTableProps<T>) {
  if (isError) {
    return (
      <ErrorState
        title="Failed to load table records"
        description={
          errorMessage ||
          'An unexpected error occurred while fetching records from the server.'
        }
        onRetry={onRetry}
        isRetrying={isFetching}
        className={className}
      />
    );
  }

  return (
    <div
      className={`relative bg-white border border-slate-200 rounded-xl overflow-hidden transition-opacity duration-150 ${
        isFetching && !isLoading ? 'opacity-85' : 'opacity-100'
      } ${className}`}
    >
      {/* Desktop & Tablet Table View (md: 768px and up) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 lg:px-6 whitespace-nowrap ${getAlignClass(
                    col.align
                  )} ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-sm">
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="py-3.5 px-4 lg:px-6">
                      <Skeleton
                        variant="line"
                        className={
                          col.align === 'right' ? 'w-16 ml-auto' : 'w-3/4'
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <MemoizedDesktopRow
                  key={keyExtractor(row, rowIndex)}
                  row={row}
                  rowIndex={rowIndex}
                  columns={columns}
                  onRowClick={onRowClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards View (< 768px, including 375px) */}
      <div className="md:hidden divide-y divide-slate-200">
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, idx) => (
            <div key={`mobile-skeleton-${idx}`} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Skeleton variant="line" className="w-40 h-4" />
                <Skeleton variant="line" className="w-16 h-4" />
              </div>
              <Skeleton variant="line" className="w-56 h-3.5" />
              <Skeleton variant="line" className="w-32 h-3.5" />
            </div>
          ))
        ) : data.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
          />
        ) : (
          data.map((row, rowIndex) => (
            <MemoizedMobileCard
              key={keyExtractor(row, rowIndex)}
              row={row}
              rowIndex={rowIndex}
              columns={columns}
              onRowClick={onRowClick}
              renderMobileCard={renderMobileCard}
            />
          ))
        )}
      </div>

      {footer}
    </div>
  );
}
