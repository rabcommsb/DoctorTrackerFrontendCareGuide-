'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Loader2,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreatePatient,
  useDeletePatient,
  useDoctors,
  usePatientsPaginated,
  useUpdatePatient,
} from '@/hooks/useClinicalData';
import { useUrlState } from '@/hooks/useUrlState';
import type { Patient } from '@/types';
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

const patientFormSchema = z.object({
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
    .min(1, 'Condition is required')
    .min(2, 'Condition must be at least 2 characters'),
  doctorId: z.string().min(1, 'Please assign a doctor'),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

const DEFAULT_CONDITIONS = [
  'Acute Exacerbation of COPD',
  'Atrial Fibrillation',
  'Congestive Heart Failure',
  'Coronary Artery Stent Surveillance',
  'Distal Radius Fracture Recovery',
  'Hypertrophic Cardiomyopathy',
  'Pediatric Asthma',
  'Refractory Vestibular Migraine',
  'Type 2 Diabetes Mellitus',
];

const DEFAULT_URL_STATE = {
  page: 1,
  pageSize: 5,
  search: '',
  condition: 'ALL',
  doctorId: 'ALL',
  from: '',
  to: '',
};

function formatCreatedDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr.slice(0, 10);
  }
}

export function PatientsRegistry() {
  const { state: urlState, setParam, setParams, resetParams } =
    useUrlState(DEFAULT_URL_STATE);

  const {
    data: paginatedResponse,
    isLoading,
    isFetching,
    isError,
    error,
    isPlaceholderData,
    refetch,
  } = usePatientsPaginated({
    page: urlState.page,
    limit: urlState.pageSize,
    search: urlState.search,
    condition: urlState.condition,
    doctorId: urlState.doctorId,
    from: urlState.from,
    to: urlState.to,
  });

  const { data: allDoctors = [] } = useDoctors();
  const createPatientMutation = useCreatePatient();
  const updatePatientMutation = useUpdatePatient();
  const deletePatientMutation = useDeletePatient();

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    watch: watchEdit,
    setValue: setValueEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema) as never,
    defaultValues: {
      name: '',
      age: 45,
      gender: 'Female',
      phone: '',
      condition: '',
      doctorId: 'doc-101',
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setValueCreate,
    formState: { errors: createErrors, isSubmitting: isCreateSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema) as never,
    defaultValues: {
      name: '',
      age: 45,
      gender: 'Female',
      phone: '',
      condition: '',
      doctorId: 'doc-101',
    },
  });

  // Pre-fill edit form whenever `editingPatient` is selected
  useEffect(() => {
    if (editingPatient) {
      const normalizedGender: 'Male' | 'Female' | 'Other' =
        editingPatient.gender === 'Male' ||
        editingPatient.gender === 'Female' ||
        editingPatient.gender === 'Other'
          ? editingPatient.gender
          : 'Female';

      resetEdit({
        name: editingPatient.name || editingPatient.fullName,
        age: editingPatient.age,
        gender: normalizedGender,
        phone: editingPatient.phone,
        condition: editingPatient.condition || editingPatient.primaryDiagnosis,
        doctorId:
          editingPatient.doctorId ||
          editingPatient.assignedDoctorId ||
          'doc-101',
      });
    }
  }, [editingPatient, resetEdit]);

  const patients = paginatedResponse?.data ?? [];
  const totalCount = paginatedResponse?.total ?? 0;

  const conditionOptions = useMemo(() => {
    const dynamicConds = paginatedResponse?.conditions?.length
      ? paginatedResponse.conditions
      : DEFAULT_CONDITIONS;
    const merged = Array.from(
      new Set([...DEFAULT_CONDITIONS, ...dynamicConds])
    ).sort();
    return [
      { value: 'ALL', label: 'All Conditions' },
      ...merged.map((c) => ({ value: c, label: c })),
    ];
  }, [paginatedResponse?.conditions]);

  const doctorFilterOptions = useMemo(() => {
    const docs =
      allDoctors.length > 0
        ? allDoctors.map((d) => ({ id: d.id, name: d.name }))
        : paginatedResponse?.doctors || [];
    return [
      { value: 'ALL', label: 'All Doctors' },
      ...docs.map((doc) => ({ value: doc.id, label: doc.name })),
    ];
  }, [allDoctors, paginatedResponse?.doctors]);

  const doctorSelectOptions = useMemo(() => {
    const docs =
      allDoctors.length > 0
        ? allDoctors.map((d) => ({ id: d.id, name: d.name }))
        : paginatedResponse?.doctors || [
            { id: 'doc-101', name: 'Dr. Elena Rostova' },
          ];
    return docs.map((doc) => ({ value: doc.id, label: doc.name }));
  }, [allDoctors, paginatedResponse?.doctors]);

  const handleOpenAddModal = useCallback(() => {
    resetCreate({
      name: '',
      age: 45,
      gender: 'Female',
      phone: '',
      condition: '',
      doctorId: doctorSelectOptions[0]?.value || 'doc-101',
    });
    setIsAddModalOpen(true);
  }, [resetCreate, doctorSelectOptions]);

  const onSubmitEdit = async (values: PatientFormValues) => {
    if (!editingPatient) return;
    const targetDoc = allDoctors.find((d) => d.id === values.doctorId);

    try {
      const updated = await updatePatientMutation.mutateAsync({
        id: editingPatient.id,
        payload: {
          name: values.name,
          age: values.age,
          gender: values.gender,
          phone: values.phone,
          condition: values.condition,
          doctorId: values.doctorId,
          doctorName: targetDoc?.name || editingPatient.doctorName,
          department: targetDoc?.specialization || editingPatient.department,
        },
      });
      toast.success(`Updated patient ${updated.name}`);
      setEditingPatient(null);
      await refetch();
    } catch {
      toast.error('Failed to update patient record.');
    }
  };

  const onSubmitCreate = async (values: PatientFormValues) => {
    const targetDoc = allDoctors.find((d) => d.id === values.doctorId);
    try {
      const created = await createPatientMutation.mutateAsync({
        name: values.name,
        age: values.age,
        gender: values.gender,
        phone: values.phone,
        condition: values.condition,
        doctorId: values.doctorId,
        doctorName: targetDoc?.name || 'Dr. Elena Rostova',
        department: targetDoc?.specialization || 'Cardiology',
      });
      toast.success(`Added patient ${created.name}`);
      resetCreate();
      setIsAddModalOpen(false);
      await refetch();
    } catch {
      toast.error('Failed to create patient record.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    try {
      await deletePatientMutation.mutateAsync(patientToDelete.id);
      toast.success(`Deleted patient ${patientToDelete.name}`);
      setPatientToDelete(null);
      await refetch();
    } catch {
      toast.error('Unable to delete patient record.');
    }
  };

  const keyExtractor = useCallback((pat: Patient) => pat.id, []);

  const columns: DataTableColumn<Patient>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (pat) => (
          <div>
            <div className="font-semibold text-slate-900">{pat.name}</div>
            <div className="text-xs text-slate-500">
              <span className="font-mono tabular-nums">{pat.mrn}</span>
              <span aria-hidden="true"> · </span>
              <span>{pat.gender}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'age',
        header: 'Age',
        align: 'right',
        className:
          'font-mono tabular-nums text-xs font-semibold text-slate-800 whitespace-nowrap',
        render: (pat) => `${pat.age} yrs`,
      },
      {
        key: 'condition',
        header: 'Condition',
        render: (pat) => <Badge variant="indigo">{pat.condition}</Badge>,
      },
      {
        key: 'doctorName',
        header: 'Doctor Name',
        render: (pat) => (
          <Link
            href={`/doctors/${pat.doctorId || pat.assignedDoctorId}`}
            className="text-xs font-medium text-slate-800 hover:text-indigo-600 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
          >
            {pat.doctorName || pat.assignedDoctorName}
          </Link>
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
        key: 'createdAt',
        header: 'Created Date',
        align: 'right',
        className:
          'font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap',
        render: (pat) => formatCreatedDate(pat.createdAt || pat.lastVisitDate),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (pat) => (
          <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setEditingPatient(pat)}
              aria-label={`Edit ${pat.name}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setPatientToDelete(pat)}
              aria-label={`Delete ${pat.name}`}
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

  // Mobile Stacked Cards (< md)
  const renderMobilePatientCard = useCallback(
    (pat: Patient) => (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {pat.name}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="font-mono tabular-nums font-medium text-slate-700">
                {pat.age} yrs
              </span>
              <span aria-hidden="true">·</span>
              <span>{pat.gender}</span>
              <span aria-hidden="true">·</span>
              <Badge variant="indigo">{pat.condition}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setEditingPatient(pat)}
              aria-label={`Edit ${pat.name}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setPatientToDelete(pat)}
              aria-label={`Delete ${pat.name}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="inline-flex items-center gap-2">
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <Link
              href={`/doctors/${pat.doctorId || pat.assignedDoctorId}`}
              className="font-medium text-slate-800 hover:text-indigo-600 transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xs"
            >
              {pat.doctorName || pat.assignedDoctorName}
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 font-mono tabular-nums">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{pat.phone}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Created</span>
          </span>
          <span className="font-mono tabular-nums text-slate-600">
            {formatCreatedDate(pat.createdAt || pat.lastVisitDate)}
          </span>
        </div>
      </div>
    ),
    []
  );

  const hasActiveFilters =
    urlState.search !== '' ||
    urlState.condition !== 'ALL' ||
    urlState.doctorId !== 'ALL' ||
    urlState.from !== '' ||
    urlState.to !== '';

  return (
    <div className="space-y-6">
      {/* Header & Add Patient Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Patients Directory
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
            Search, filter by condition, doctor, and created date range with
            server-side pagination synced to the URL
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenAddModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Patient
        </Button>
      </div>

      {/* URL-Synced Filter Bar: SearchInput + Condition + Doctor + DateRangeFilter */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-700 tracking-tight mb-1.5">
              Search Patients
            </label>
            <SearchInput
              value={urlState.search}
              onChange={(val) => setParam('search', val)}
              placeholder="Name, condition, doctor, phone..."
              ariaLabel="Search patients by name, condition, doctor, or phone"
            />
          </div>

          <div className="lg:col-span-2">
            <Select
              label="Condition"
              value={urlState.condition}
              options={conditionOptions}
              onChange={(val) => setParam('condition', val)}
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              label="Assigned Doctor"
              value={urlState.doctorId}
              options={doctorFilterOptions}
              onChange={(val) => setParam('doctorId', val)}
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
                aria-label="Clear all patient filters"
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
        data={patients}
        keyExtractor={keyExtractor}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        errorMessage={
          error instanceof Error
            ? error.message
            : 'Unable to load patients directory. Please try again.'
        }
        onRetry={() => refetch()}
        skeletonRows={urlState.pageSize}
        renderMobileCard={renderMobilePatientCard}
        emptyTitle="No patients match your filters"
        emptyDescription="Try clearing your search query, condition, doctor, or created date range filters."
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

      {/* Pre-Filled Edit Patient Modal Form (PATCH /patients/:id) */}
      <Modal
        isOpen={Boolean(editingPatient)}
        onClose={() => setEditingPatient(null)}
        title="Edit Patient Record"
        description={
          editingPatient
            ? `Updating clinical record ${editingPatient.mrn} via PATCH /patients/${editingPatient.id}`
            : undefined
        }
        size="md"
      >
        <form
          onSubmit={handleSubmitEdit(onSubmitEdit)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Patient Full Name"
            placeholder="Arthur Pendelton"
            disabled={isEditSubmitting || updatePatientMutation.isPending}
            error={editErrors.name?.message}
            {...registerEdit('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Age"
              type="number"
              min={0}
              max={125}
              disabled={isEditSubmitting || updatePatientMutation.isPending}
              error={editErrors.age?.message}
              {...registerEdit('age')}
            />

            <Select
              label="Gender"
              value={watchEdit('gender')}
              onChange={(val) =>
                setValueEdit('gender', val as 'Male' | 'Female' | 'Other', {
                  shouldValidate: true,
                })
              }
              disabled={isEditSubmitting || updatePatientMutation.isPending}
              error={editErrors.gender?.message}
              options={[
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1 (415) 509-1120"
              disabled={isEditSubmitting || updatePatientMutation.isPending}
              error={editErrors.phone?.message}
              {...registerEdit('phone')}
            />

            <Select
              label="Assigned Doctor"
              value={watchEdit('doctorId')}
              onChange={(val) =>
                setValueEdit('doctorId', val, { shouldValidate: true })
              }
              disabled={isEditSubmitting || updatePatientMutation.isPending}
              error={editErrors.doctorId?.message}
              options={doctorSelectOptions}
            />
          </div>

          <Input
            label="Medical Condition"
            placeholder="Atrial Fibrillation"
            disabled={isEditSubmitting || updatePatientMutation.isPending}
            error={editErrors.condition?.message}
            {...registerEdit('condition')}
          />

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingPatient(null)}
              disabled={isEditSubmitting || updatePatientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isEditSubmitting || updatePatientMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Patient Modal Form (POST /patients) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Patient"
        description="Creates a new patient record and links them to an attending doctor."
        size="md"
      >
        <form
          onSubmit={handleSubmitCreate(onSubmitCreate)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Patient Full Name"
            placeholder="Miriam Vance"
            disabled={isCreateSubmitting || createPatientMutation.isPending}
            error={createErrors.name?.message}
            {...registerCreate('name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Age"
              type="number"
              min={0}
              max={125}
              disabled={isCreateSubmitting || createPatientMutation.isPending}
              error={createErrors.age?.message}
              {...registerCreate('age')}
            />

            <Select
              label="Gender"
              value={watchCreate('gender')}
              onChange={(val) =>
                setValueCreate('gender', val as 'Male' | 'Female' | 'Other', {
                  shouldValidate: true,
                })
              }
              disabled={isCreateSubmitting || createPatientMutation.isPending}
              error={createErrors.gender?.message}
              options={[
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1 (415) 509-4410"
              disabled={isCreateSubmitting || createPatientMutation.isPending}
              error={createErrors.phone?.message}
              {...registerCreate('phone')}
            />

            <Select
              label="Assigned Doctor"
              value={watchCreate('doctorId')}
              onChange={(val) =>
                setValueCreate('doctorId', val, { shouldValidate: true })
              }
              disabled={isCreateSubmitting || createPatientMutation.isPending}
              error={createErrors.doctorId?.message}
              options={doctorSelectOptions}
            />
          </div>

          <Input
            label="Medical Condition"
            placeholder="Hypertrophic Cardiomyopathy"
            disabled={isCreateSubmitting || createPatientMutation.isPending}
            error={createErrors.condition?.message}
            {...registerCreate('condition')}
          />

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isCreateSubmitting || createPatientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreateSubmitting || createPatientMutation.isPending}
            >
              Add Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* ConfirmDialog for Deleting a Patient */}
      <ConfirmDialog
        isOpen={Boolean(patientToDelete)}
        onClose={() => setPatientToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Patient Record"
        description={
          patientToDelete
            ? `Are you sure you want to permanently delete ${patientToDelete.name} (${patientToDelete.condition}) from the patient roster?`
            : undefined
        }
        confirmLabel="Delete Patient"
        isLoading={deletePatientMutation.isPending}
      />
    </div>
  );
}
