'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Loader2,
  Mail,
  Phone,
  Plus,
  RotateCcw,
  Stethoscope,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreatePatient,
  useDeletePatient,
  useDoctor,
  useDoctorPatients,
} from '@/hooks/useClinicalData';
import { useUrlState } from '@/hooks/useUrlState';
import type { DoctorStatus, Patient } from '@/types';
import {
  Badge,
  BadgeVariant,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DataTableColumn,
  ErrorState,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
} from '@/components/ui';

const addPatientSchema = z.object({
  name: z
    .string()
    .min(1, 'Patient name is required')
    .min(2, 'Name must be at least 2 characters'),
  age: z.coerce
    .number({ message: 'Enter a valid numeric age' })
    .int('Age must be a whole number')
    .min(0, 'Age must be between 0 and 125')
    .max(125, 'Age must be between 0 and 125'),
  gender: z.enum(['Male', 'Female', 'Other'], {
    message: 'Please select a gender',
  }),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^[+0-9()\-\s]{7,20}$/,
      'Enter a valid phone number (e.g. +1 (415) 509-1120)'
    ),
  condition: z
    .string()
    .min(1, 'Medical condition is required')
    .min(2, 'Condition must be at least 2 characters'),
});

type AddPatientFormValues = z.infer<typeof addPatientSchema>;

const STATUS_LABELS: Record<DoctorStatus, string> = {
  ON_DUTY: 'On Duty',
  IN_CONSULTATION: 'In Consultation',
  ON_CALL: 'On Call',
  OFF_DUTY: 'Off Duty',
};

const STATUS_VARIANTS: Record<DoctorStatus, BadgeVariant> = {
  ON_DUTY: 'success',
  IN_CONSULTATION: 'indigo',
  ON_CALL: 'warning',
  OFF_DUTY: 'neutral',
};

const DEFAULT_PATIENT_URL_STATE = {
  page: 1,
  pageSize: 5,
  search: '',
};

function formatDateSafe(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr.slice(0, 10);
  }
}

interface DoctorDetailViewProps {
  doctorId: string;
}

export function DoctorDetailView({ doctorId }: DoctorDetailViewProps) {
  const { state: urlState, setParam, setParams, resetParams } = useUrlState(
    DEFAULT_PATIENT_URL_STATE
  );

  const {
    data: doctor,
    isLoading: isDoctorLoading,
    isError: isDoctorError,
    error: doctorError,
    refetch: refetchDoctor,
  } = useDoctor(doctorId);

  const {
    data: patientsResponse,
    isLoading: isPatientsLoading,
    isFetching: isPatientsFetching,
    isError: isPatientsError,
    error: patientsError,
    refetch: refetchDoctorPatients,
  } = useDoctorPatients({
    doctorId,
    page: urlState.page,
    limit: urlState.pageSize,
    search: urlState.search,
  });

  const createPatientMutation = useCreatePatient();
  const deletePatientMutation = useDeletePatient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddPatientFormValues>({
    resolver: zodResolver(addPatientSchema) as never,
    defaultValues: {
      name: '',
      age: 45,
      gender: 'Female',
      phone: '',
      condition: '',
    },
  });

  const selectedGender = watch('gender');

  const patients = patientsResponse?.data ?? [];
  const totalPatientsCount = patientsResponse?.total ?? 0;

  const handleOpenAddModal = useCallback(() => {
    reset({
      name: '',
      age: 45,
      gender: 'Female',
      phone: '',
      condition: '',
    });
    setIsAddModalOpen(true);
  }, [reset]);

  const onSubmitAddPatient = async (values: AddPatientFormValues) => {
    if (!doctor) return;
    try {
      const created = await createPatientMutation.mutateAsync({
        name: values.name,
        age: values.age,
        gender: values.gender,
        phone: values.phone,
        condition: values.condition,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: doctor.specialization,
      });

      toast.success(`Added patient ${created.name} under ${doctor.name}`);
      reset();
      setIsAddModalOpen(false);
      await Promise.all([refetchDoctorPatients(), refetchDoctor()]);
    } catch {
      toast.error('Failed to add patient. Please try again.');
    }
  };

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete) return;
    const removedName = patientToDelete.name;
    try {
      await deletePatientMutation.mutateAsync(patientToDelete.id);
      toast.success(
        `Removed ${removedName} from ${doctor?.name || 'doctor'}'s patient list`
      );
      setPatientToDelete(null);
      await Promise.all([refetchDoctorPatients(), refetchDoctor()]);
    } catch {
      toast.error('Failed to remove patient from list.');
    }
  };

  const keyExtractor = useCallback((pat: Patient) => pat.id, []);

  const patientColumns: DataTableColumn<Patient>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Patient Name',
        render: (pat) => (
          <div>
            <div className="font-semibold text-slate-900">{pat.name}</div>
            <div className="text-xs font-mono tabular-nums text-slate-500">
              {pat.mrn}
            </div>
          </div>
        ),
      },
      {
        key: 'demographics',
        header: 'Age · Gender',
        render: (pat) => (
          <div className="text-xs text-slate-700 whitespace-nowrap">
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {pat.age} yrs
            </span>
            <span aria-hidden="true"> · </span>
            <span>{pat.gender}</span>
          </div>
        ),
      },
      {
        key: 'phone',
        header: 'Phone',
        className:
          'font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap',
        accessor: 'phone',
      },
      {
        key: 'condition',
        header: 'Condition',
        render: (pat) => (
          <span className="text-xs font-medium text-slate-800">
            {pat.condition}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Added Date',
        align: 'right',
        className:
          'font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap',
        render: (pat) => formatDateSafe(pat.createdAt || pat.lastVisitDate),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (pat) => (
          <button
            type="button"
            onClick={() => setPatientToDelete(pat)}
            aria-label={`Remove ${pat.name}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        ),
      },
    ],
    []
  );

  const renderMobilePatientCard = useCallback(
    (pat: Patient) => (
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {pat.name}
            </div>
            <div className="text-xs text-slate-500">
              <span className="font-mono tabular-nums">{pat.mrn}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">{pat.age} yrs</span>
              <span aria-hidden="true"> · </span>
              <span>{pat.gender}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPatientToDelete(pat)}
            aria-label={`Remove ${pat.name}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50/70 hover:bg-red-100/80 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>

        <div className="text-xs text-slate-700">
          <span className="text-slate-500">Condition: </span>
          <span className="font-medium text-slate-900">{pat.condition}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span className="font-mono tabular-nums">{pat.phone}</span>
          <span className="font-mono tabular-nums">
            {formatDateSafe(pat.createdAt || pat.lastVisitDate)}
          </span>
        </div>
      </div>
    ),
    []
  );

  // Error State for Doctor Profile
  if (isDoctorError) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Doctors</span>
          </Link>
        </div>
        <ErrorState
          title="Unable to load doctor profile"
          message={
            doctorError instanceof Error
              ? doctorError.message
              : `Could not retrieve details for doctor ID "${doctorId}".`
          }
          onRetry={() => {
            refetchDoctor();
            refetchDoctorPatients();
          }}
        />
      </div>
    );
  }

  // Loading Skeleton State for Doctor Header + Patients Section
  if (isDoctorLoading || !doctor) {
    return (
      <div
        className="space-y-8"
        aria-busy="true"
        aria-label="Loading doctor profile and patients"
      >
        <Skeleton variant="line" className="w-40 h-4" />
        <Card className="p-5 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div className="space-y-2.5">
              <Skeleton variant="line" className="w-48 sm:w-56 h-4" />
              <Skeleton variant="line" className="w-60 sm:w-72 h-8" />
              <Skeleton variant="line" className="w-36 h-4" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton variant="line" className="w-44 h-9 rounded-lg" />
              <Skeleton variant="line" className="w-36 h-9 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="space-y-2">
                <Skeleton variant="line" className="w-28 h-3.5" />
                <Skeleton variant="line" className="w-20 h-7" />
                <Skeleton variant="line" className="w-32 h-3" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 sm:p-6 space-y-4">
          <Skeleton variant="line" className="w-48 h-6" />
          <Skeleton variant="rect" className="h-56" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/doctors"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Doctors</span>
        </Link>
      </div>

      {/* Header Card with Doctor's Details */}
      <Card
        aria-label="Doctor Profile Details"
        className="p-5 sm:p-8 space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>{doctor.hospital}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {doctor.licenseNumber}
              </span>
              <span aria-hidden="true">·</span>
              <Badge variant={STATUS_VARIANTS[doctor.status]}>
                {STATUS_LABELS[doctor.status]}
              </Badge>
            </div>

            <h1 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {doctor.name}
            </h1>

            <div className="flex items-center gap-2 text-sm">
              <Badge variant="indigo">{doctor.specialization}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-slate-600 shrink-0">
            <a
              href={`mailto:${doctor.email}`}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-none">
                {doctor.email}
              </span>
            </a>
            <a
              href={`tel:${doctor.phone}`}
              className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono tabular-nums transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{doctor.phone}</span>
            </a>
          </div>
        </div>

        {/* 4-Column Doctor Telemetry Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Assigned Patients</span>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {totalPatientsCount}
            </p>
            <p className="text-xs text-slate-500">Under direct care</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
              <span>Today&apos;s Consultations</span>
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {doctor.todayAppointmentsCount}
            </p>
            <p className="text-xs text-slate-500">Scheduled on shift</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Next Open Consult Slot</span>
            </div>
            <p className="text-base font-semibold font-mono tabular-nums text-slate-900 pt-1">
              {format(
                parseISO(doctor.nextAvailableSlot),
                'MMM d, yyyy · HH:mm'
              )}
            </p>
            <p className="text-xs text-slate-500">Outpatient & inpatient</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Created Date</span>
            </div>
            <p className="text-base font-semibold font-mono tabular-nums text-slate-900 pt-1">
              {formatDateSafe(doctor.createdAt || doctor.joinedDate)}
            </p>
            <p className="text-xs text-slate-500">{doctor.hospital}</p>
          </div>
        </div>
      </Card>

      {/* Patients Section with Search, Pagination, Add Patient Modal, and Delete ConfirmDialog */}
      <section aria-label="Doctor's Patients" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Patients
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                ({totalPatientsCount} total)
              </span>
              {isPatientsFetching && !isPatientsLoading && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600"
                  aria-live="polite"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Manage patients assigned to {doctor.name} ({doctor.specialization}
              )
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-72">
              <SearchInput
                value={urlState.search}
                onChange={(val) => setParam('search', val)}
                placeholder="Search by name, condition, phone..."
                ariaLabel="Search doctor's patients"
              />
            </div>

            {urlState.search && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={resetParams}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                aria-label="Reset patient search"
              >
                Reset
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleOpenAddModal}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Patient
            </Button>
          </div>
        </div>

        <DataTable
          columns={patientColumns}
          data={patients}
          keyExtractor={keyExtractor}
          isLoading={isPatientsLoading}
          isFetching={isPatientsFetching}
          isError={isPatientsError}
          errorMessage={
            patientsError instanceof Error
              ? patientsError.message
              : `Unable to load patients for ${doctor.name}.`
          }
          onRetry={() => refetchDoctorPatients()}
          skeletonRows={urlState.pageSize}
          renderMobileCard={renderMobilePatientCard}
          emptyTitle={
            urlState.search
              ? 'No matching patients found'
              : `No patients assigned to ${doctor.name} yet`
          }
          emptyDescription={
            urlState.search
              ? 'Try clearing your search query or searching for a different condition.'
              : `Click "Add Patient" to register the first patient under ${doctor.name}.`
          }
          emptyActionLabel={urlState.search ? 'Clear Search' : 'Add Patient'}
          onEmptyAction={urlState.search ? resetParams : handleOpenAddModal}
          footer={
            <Pagination
              page={urlState.page}
              pageSize={urlState.pageSize}
              totalCount={totalPatientsCount}
              onPageChange={(nextPage) =>
                setParam('page', nextPage, { resetPage: false })
              }
              onPageSizeChange={(nextSize) =>
                setParams({ pageSize: nextSize, page: 1 }, { resetPage: false })
              }
            />
          }
        />
      </section>

      {/* "Add Patient" Modal (name, age, gender, phone, condition) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add Patient under ${doctor.name}`}
        description={`Assigns a new patient directly to ${doctor.name} (${doctor.specialization} · ${doctor.hospital}).`}
        size="md"
      >
        <form
          onSubmit={handleSubmit(onSubmitAddPatient)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Patient Full Name"
            placeholder="Clara Morales"
            disabled={isSubmitting || createPatientMutation.isPending}
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Age"
              type="number"
              min={0}
              max={125}
              placeholder="45"
              disabled={isSubmitting || createPatientMutation.isPending}
              error={errors.age?.message}
              {...register('age')}
            />

            <Select
              label="Gender"
              value={selectedGender}
              onChange={(val) =>
                setValue('gender', val as 'Male' | 'Female' | 'Other', {
                  shouldValidate: true,
                })
              }
              disabled={isSubmitting || createPatientMutation.isPending}
              error={errors.gender?.message}
              options={[
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (415) 509-1120"
            disabled={isSubmitting || createPatientMutation.isPending}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Medical Condition / Diagnosis"
            placeholder="Atrial Fibrillation Follow-up"
            disabled={isSubmitting || createPatientMutation.isPending}
            error={errors.condition?.message}
            {...register('condition')}
          />

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting || createPatientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || createPatientMutation.isPending}
            >
              Add Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* ConfirmDialog for Removing Patient from Doctor's List */}
      <ConfirmDialog
        isOpen={Boolean(patientToDelete)}
        onClose={() => setPatientToDelete(null)}
        onConfirm={handleConfirmDeletePatient}
        title="Remove Patient from Doctor's List"
        description={
          patientToDelete
            ? `Are you sure you want to remove ${patientToDelete.name} (${patientToDelete.condition}) from ${doctor.name}'s patient list?`
            : undefined
        }
        confirmLabel="Delete Patient"
        isLoading={deletePatientMutation.isPending}
      />
    </div>
  );
}
