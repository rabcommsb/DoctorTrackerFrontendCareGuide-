'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  Calendar,
  Loader2,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateDoctor,
  useDeleteDoctor,
  useDoctorsPaginated,
} from '@/hooks/useClinicalData';
import { useUrlState } from '@/hooks/useUrlState';
import type { Doctor } from '@/types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DataTableColumn,
  DateRangeFilter,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
} from '@/components/ui';

const addDoctorSchema = z.object({
  name: z
    .string()
    .min(1, 'Doctor name is required')
    .min(3, 'Name must be at least 3 characters'),
  specialization: z
    .string()
    .min(1, 'Specialization is required')
    .min(2, 'Specialization must be at least 2 characters'),
  hospital: z
    .string()
    .min(1, 'Hospital is required')
    .min(2, 'Hospital name must be at least 2 characters'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^[+0-9()\-\s]{7,20}$/,
      'Enter a valid phone number (e.g. +1 (415) 891-2041)'
    ),
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Enter a valid email address'),
});

type AddDoctorFormValues = z.infer<typeof addDoctorSchema>;

interface ServerErrorPayload {
  message?: string;
  error?: string;
  field?: keyof AddDoctorFormValues;
  errors?: Partial<Record<keyof AddDoctorFormValues, string | string[]>>;
}

const DEFAULT_SPECIALIZATIONS = [
  'Cardiology',
  'Internal Medicine',
  'Neurology',
  'Oncology',
  'Orthopedics',
  'Pediatrics',
  'Pulmonology',
];

const DEFAULT_HOSPITALS = [
  'Johns Hopkins Hospital',
  'Mass General Hospital',
  'Mayo Clinic Health',
  'Mount Sinai Hospital',
  'St. Jude Medical Center',
];

const DEFAULT_URL_STATE = {
  page: 1,
  pageSize: 5,
  search: '',
  specialization: 'ALL',
  hospital: 'ALL',
  from: '',
  to: '',
};

function formatCreatedDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr.slice(0, 10);
  }
}

export function DoctorsDirectory() {
  const { state: urlState, setParam, setParams, resetParams } =
    useUrlState(DEFAULT_URL_STATE);

  // Server-side paginated & filtered query with placeholderData (keepPreviousData)
  const {
    data: paginatedResponse,
    isLoading,
    isFetching,
    isError,
    error,
    isPlaceholderData,
    refetch,
  } = useDoctorsPaginated({
    page: urlState.page,
    limit: urlState.pageSize,
    search: urlState.search,
    specialization: urlState.specialization,
    hospital: urlState.hospital,
    from: urlState.from,
    to: urlState.to,
  });

  const createDoctorMutation = useCreateDoctor();
  const deleteDoctorMutation = useDeleteDoctor();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [serverErrorBanner, setServerErrorBanner] = useState<string | null>(
    null
  );
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<AddDoctorFormValues>({
    resolver: zodResolver(addDoctorSchema),
    defaultValues: {
      name: '',
      specialization: '',
      hospital: '',
      phone: '',
      email: '',
    },
  });

  const doctors = paginatedResponse?.data ?? [];
  const totalCount = paginatedResponse?.total ?? 0;

  const specializationOptions = useMemo(() => {
    const dynamicSpecs = paginatedResponse?.specializations?.length
      ? paginatedResponse.specializations
      : DEFAULT_SPECIALIZATIONS;
    const merged = Array.from(
      new Set([...DEFAULT_SPECIALIZATIONS, ...dynamicSpecs])
    ).sort();
    return [
      { value: 'ALL', label: 'All Specializations' },
      ...merged.map((spec) => ({ value: spec, label: spec })),
    ];
  }, [paginatedResponse?.specializations]);

  const hospitalOptions = useMemo(() => {
    const dynamicHospitals = paginatedResponse?.hospitals?.length
      ? paginatedResponse.hospitals
      : DEFAULT_HOSPITALS;
    const merged = Array.from(
      new Set([...DEFAULT_HOSPITALS, ...dynamicHospitals])
    ).sort();
    return [
      { value: 'ALL', label: 'All Hospitals' },
      ...merged.map((hosp) => ({ value: hosp, label: hosp })),
    ];
  }, [paginatedResponse?.hospitals]);

  const handleOpenAddModal = useCallback(() => {
    setServerErrorBanner(null);
    clearErrors();
    reset({
      name: '',
      specialization: '',
      hospital: '',
      phone: '',
      email: '',
    });
    setIsAddModalOpen(true);
  }, [clearErrors, reset]);

  const handleCloseAddModal = useCallback(() => {
    setServerErrorBanner(null);
    setIsAddModalOpen(false);
  }, []);

  const onSubmitCreate = async (values: AddDoctorFormValues) => {
    setServerErrorBanner(null);
    try {
      const created = await createDoctorMutation.mutateAsync(values);
      toast.success(
        `Dr. ${created.name.replace(/^Dr\.\s*/i, '')} added successfully`
      );
      reset();
      setIsAddModalOpen(false);
      await refetch();
    } catch (err) {
      const axiosErr = err as AxiosError<ServerErrorPayload>;
      const responseData = axiosErr.response?.data;

      // Map field-level validation errors from server response onto react-hook-form fields
      let handledFieldError = false;

      if (responseData?.errors && typeof responseData.errors === 'object') {
        (
          Object.entries(responseData.errors) as Array<
            [keyof AddDoctorFormValues, string | string[] | undefined]
          >
        ).forEach(([fieldKey, fieldMsg]) => {
          if (fieldMsg) {
            const msgText = Array.isArray(fieldMsg) ? fieldMsg[0] : fieldMsg;
            setError(fieldKey, { type: 'server', message: msgText });
            handledFieldError = true;
          }
        });
      }

      if (responseData?.field && responseData?.message) {
        setError(responseData.field, {
          type: 'server',
          message: responseData.message,
        });
        handledFieldError = true;
      }

      const fallbackMsg =
        responseData?.message ||
        responseData?.error ||
        (axiosErr.response?.status === 409
          ? 'A doctor with this email address already exists.'
          : 'Unable to save doctor. Please check the form fields and try again.');

      if (
        !handledFieldError &&
        fallbackMsg.toLowerCase().includes('email')
      ) {
        setError('email', { type: 'server', message: fallbackMsg });
      }

      setServerErrorBanner(fallbackMsg);
      toast.error(fallbackMsg);
    }
  };

  const handleFillDuplicateEmailTest = useCallback(() => {
    setServerErrorBanner(null);
    clearErrors();
    setValue('name', 'Dr. Elena Rostova', { shouldValidate: true });
    setValue('specialization', 'Cardiology', { shouldValidate: true });
    setValue('hospital', 'Mount Sinai Hospital', { shouldValidate: true });
    setValue('phone', '+1 (415) 891-2041', { shouldValidate: true });
    setValue('email', 'e.rostova@doctortracker.io', { shouldValidate: true });
  }, [clearErrors, setValue]);

  const handleConfirmDelete = async () => {
    if (!doctorToDelete) return;
    try {
      await deleteDoctorMutation.mutateAsync(doctorToDelete.id);
      toast.success(`Removed ${doctorToDelete.name} from directory`);
      setDoctorToDelete(null);
      await refetch();
    } catch {
      toast.error('Unable to delete doctor record');
    }
  };

  const keyExtractor = useCallback((doc: Doctor) => doc.id, []);

  const columns: DataTableColumn<Doctor>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (doc) => (
          <div className="font-semibold text-slate-900">
            <Link
              href={`/doctors/${doc.id}`}
              className="hover:text-indigo-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
            >
              {doc.name}
            </Link>
          </div>
        ),
      },
      {
        key: 'specialization',
        header: 'Specialization',
        render: (doc) => <Badge variant="indigo">{doc.specialization}</Badge>,
      },
      {
        key: 'hospital',
        header: 'Hospital',
        className: 'text-xs font-medium text-slate-700',
        accessor: 'hospital',
      },
      {
        key: 'phone',
        header: 'Phone',
        className:
          'font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap',
        accessor: 'phone',
      },
      {
        key: 'email',
        header: 'Email',
        className: 'text-xs text-slate-600 whitespace-nowrap',
        render: (doc) => (
          <a
            href={`mailto:${doc.email}`}
            className="hover:text-indigo-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
          >
            {doc.email}
          </a>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created Date',
        align: 'right',
        className:
          'font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap',
        render: (doc) => formatCreatedDate(doc.createdAt || doc.joinedDate),
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        render: (doc) => (
          <div className="inline-flex items-center justify-end gap-2.5 whitespace-nowrap">
            <Link
              href={`/doctors/${doc.id}`}
              aria-label={`View profile for ${doc.name}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100/80 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span>View</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setDoctorToDelete(doc)}
              aria-label={`Delete ${doc.name}`}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Mobile stacked card renderer (< md)
  const renderMobileDoctorCard = useCallback(
    (doc: Doctor) => (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <Link
              href={`/doctors/${doc.id}`}
              className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors block truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
            >
              {doc.name}
            </Link>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <Badge variant="indigo">{doc.specialization}</Badge>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{doc.hospital}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={`/doctors/${doc.id}`}
              aria-label={`View profile for ${doc.name}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span>View</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setDoctorToDelete(doc)}
              aria-label={`Delete ${doc.name}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="inline-flex items-center gap-2 truncate">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{doc.email}</span>
          </div>
          <div className="inline-flex items-center gap-2 font-mono tabular-nums">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{doc.phone}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Created</span>
          </span>
          <span className="font-mono tabular-nums text-slate-600">
            {formatCreatedDate(doc.createdAt || doc.joinedDate)}
          </span>
        </div>
      </div>
    ),
    []
  );

  const hasActiveFilters =
    urlState.search !== '' ||
    urlState.specialization !== 'ALL' ||
    urlState.hospital !== 'ALL' ||
    urlState.from !== '' ||
    urlState.to !== '';

  return (
    <div className="space-y-6">
      {/* Header & Add Doctor Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Doctors Directory
            </h1>
            {(isFetching || isPlaceholderData) && !isLoading && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600"
                aria-live="polite"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Server-side paginated directory with URL-synced search,
            specialization, hospital, and created date filters
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAddModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Doctor
        </Button>
      </div>

      {/* URL-Synced Filter Bar: SearchInput (300ms debounce) + Specialization + Hospital + DateRangeFilter */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-700 tracking-tight mb-1.5">
              Search Doctors
            </label>
            <SearchInput
              value={urlState.search}
              onChange={(val) => setParam('search', val)}
              placeholder="Name, email, phone, hospital..."
              ariaLabel="Search doctors by name, email, phone, or hospital"
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              label="Specialization"
              value={urlState.specialization}
              options={specializationOptions}
              onChange={(val) => setParam('specialization', val)}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              label="Hospital"
              value={urlState.hospital}
              options={hospitalOptions}
              onChange={(val) => setParam('hospital', val)}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row sm:items-end gap-2">
            <DateRangeFilter
              label="Created Date Range"
              from={urlState.from}
              to={urlState.to}
              onChange={({ from, to }) => setParams({ from, to })}
              className="flex-1"
            />
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={resetParams}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                title="Clear all filters"
                aria-label="Clear all doctor filters"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* DataTable (Desktop Table + Mobile Stacked Cards) & Server-Side Pagination */}
      <DataTable
        columns={columns}
        data={doctors}
        keyExtractor={keyExtractor}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        errorMessage={
          error instanceof Error
            ? error.message
            : 'Unable to load doctors directory. Please try again.'
        }
        onRetry={() => refetch()}
        skeletonRows={urlState.pageSize}
        renderMobileCard={renderMobileDoctorCard}
        emptyTitle="No doctors match your filters"
        emptyDescription="Try clearing your search query, specialization, hospital, or date range filters."
        emptyActionLabel="Reset Filters"
        onEmptyAction={resetParams}
        footer={
          <Pagination
            page={urlState.page}
            pageSize={urlState.pageSize}
            totalCount={totalCount}
            onPageChange={(nextPage) =>
              setParam('page', nextPage, { resetPage: false })
            }
            onPageSizeChange={(nextSize) =>
              setParams({ pageSize: nextSize, page: 1 }, { resetPage: false })
            }
          />
        }
      />

      {/* Add Doctor Modal Form (name, specialization, hospital, phone, email) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Add Doctor"
        description="Enter the physician's details below. All fields are validated before saving."
        size="md"
      >
        <form
          onSubmit={handleSubmit(onSubmitCreate)}
          className="space-y-4"
          noValidate
        >
          {serverErrorBanner && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Server Validation Error</p>
                <p>{serverErrorBanner}</p>
              </div>
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="Dr. Sophia Lin"
            disabled={isSubmitting || createDoctorMutation.isPending}
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Specialization"
              placeholder="Cardiology"
              disabled={isSubmitting || createDoctorMutation.isPending}
              error={errors.specialization?.message}
              {...register('specialization')}
            />
            <Input
              label="Hospital"
              placeholder="Mount Sinai Hospital"
              disabled={isSubmitting || createDoctorMutation.isPending}
              error={errors.hospital?.message}
              {...register('hospital')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1 (415) 891-7200"
              disabled={isSubmitting || createDoctorMutation.isPending}
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="s.lin@doctortracker.io"
              disabled={isSubmitting || createDoctorMutation.isPending}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          {/* Helper to test duplicate email validation error */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Test server duplicate email rejection:</span>
            <button
              type="button"
              onClick={handleFillDuplicateEmailTest}
              className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
            >
              Fill Existing Email (e.rostova@doctortracker.io)
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseAddModal}
              disabled={isSubmitting || createDoctorMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || createDoctorMutation.isPending}
            >
              Add Doctor
            </Button>
          </div>
        </form>
      </Modal>

      {/* ConfirmDialog for Deleting a Doctor */}
      <ConfirmDialog
        isOpen={Boolean(doctorToDelete)}
        onClose={() => setDoctorToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Doctor"
        description={
          doctorToDelete
            ? `Are you sure you want to remove ${doctorToDelete.name} (${doctorToDelete.hospital}) from the directory?`
            : undefined
        }
        confirmLabel="Delete Doctor"
        isLoading={deleteDoctorMutation.isPending}
      />
    </div>
  );
}
