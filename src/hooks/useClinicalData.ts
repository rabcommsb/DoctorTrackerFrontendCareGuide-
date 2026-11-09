'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  CreateDoctorPayload,
  CreatePatientPayload,
  DashboardRange,
  DashboardStats,
  DashboardSummary,
  Doctor,
  DoctorPatientsQueryParams,
  DoctorsQueryParams,
  PaginatedDoctorsResponse,
  PaginatedPatientsResponse,
  Patient,
  PatientsQueryParams,
  UpdatePatientPayload,
} from '@/types';

function unwrapEntity<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data?: unknown }).data &&
    !Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function normalizeDoctor(rawInput: unknown): Doctor {
  const raw = (unwrapEntity<Record<string, unknown>>(rawInput) || {}) as Partial<Doctor> &
    Record<string, unknown>;
  const id = String(raw.id || raw._id || `doc-${Date.now()}`);
  const name = String(raw.name || raw.fullName || 'Dr. Unknown');
  const specialization = String(
    raw.specialization || raw.specialty || 'General Medicine'
  );
  const hospital = String(
    raw.hospital || raw.department || 'General Hospital'
  );
  const createdAt = String(
    raw.createdAt ||
      (raw.joinedDate ? `${raw.joinedDate}T09:00:00Z` : new Date().toISOString())
  );

  return {
    id,
    name,
    specialization,
    hospital,
    phone: String(raw.phone || '+1 (415) 891-0000'),
    email: String(raw.email || 'doctor@doctortracker.io'),
    createdAt,
    fullName: String(raw.fullName || name),
    specialty: String(raw.specialty || specialization),
    department: String(raw.department || specialization),
    licenseNumber: String(raw.licenseNumber || 'MD-90000-CA'),
    status: (raw.status as Doctor['status']) || 'ON_DUTY',
    activePatientsCount: Number(raw.activePatientsCount ?? raw.patientCount ?? 0),
    todayAppointmentsCount: Number(raw.todayAppointmentsCount ?? 0),
    nextAvailableSlot: String(
      raw.nextAvailableSlot || new Date(Date.now() + 7200 * 1000).toISOString()
    ),
    joinedDate: String(raw.joinedDate || createdAt.slice(0, 10)),
  };
}

function normalizePatient(rawInput: unknown): Patient {
  const raw = (unwrapEntity<Record<string, unknown>>(rawInput) || {}) as Partial<Patient> &
    Record<string, unknown>;

  const populatedDoctor =
    raw.doctor && typeof raw.doctor === 'object'
      ? (raw.doctor as Record<string, unknown>)
      : null;

  const id = String(raw.id || raw._id || `pat-${Date.now()}`);
  const name = String(raw.name || raw.fullName || 'Unknown Patient');
  const condition = String(
    raw.condition || raw.primaryDiagnosis || 'General Evaluation'
  );
  const doctorId = String(
    raw.doctorId ||
      raw.assignedDoctorId ||
      populatedDoctor?._id ||
      populatedDoctor?.id ||
      (typeof raw.doctor === 'string' ? raw.doctor : '') ||
      'doc-101'
  );
  const doctorName = String(
    raw.doctorName ||
      raw.assignedDoctorName ||
      populatedDoctor?.name ||
      'Dr. Elena Rostova'
  );
  const department = String(
    raw.department || populatedDoctor?.specialization || 'Cardiology'
  );
  const lastVisitDate = String(
    raw.lastVisitDate || raw.createdAt || new Date().toISOString()
  );
  const age = Number(raw.age ?? 45);

  return {
    id,
    name,
    fullName: String(raw.fullName || name),
    mrn: String(raw.mrn || `MRN-${id.slice(-6).toUpperCase()}`),
    dateOfBirth: String(raw.dateOfBirth || `${2026 - age}-05-14`),
    age,
    gender: String(raw.gender || 'Female'),
    phone: String(raw.phone || '+1 (415) 509-1120'),
    condition,
    primaryDiagnosis: String(raw.primaryDiagnosis || condition),
    doctorId,
    doctorName,
    assignedDoctorId: String(raw.assignedDoctorId || doctorId),
    assignedDoctorName: doctorName,
    department,
    acuity: (raw.acuity as Patient['acuity']) || 'STABLE',
    createdAt: String(raw.createdAt || lastVisitDate),
    lastVisitDate,
    nextAppointmentDate:
      raw.nextAppointmentDate !== undefined
        ? (raw.nextAppointmentDate as string | null)
        : null,
    roomNumber: raw.roomNumber ? String(raw.roomNumber) : 'Outpatient-1',
  };
}

export function useDashboardSummary(enabled = true) {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>('/dashboard/summary');
      return data;
    },
    enabled,
  });
}

/**
 * Fetches dashboard statistics and chart series from GET /dashboard/stats
 * for the selected 7 / 30 / 90 day range using a stable primitive query key.
 * Normalizes both backend aggregation format (`newThisWeek`, `doctorsOverTime`, `patientsPerDoctor[].name`)
 * and frontend `DashboardStats` format.
 */
export function useDashboardStats(range: DashboardRange = 30, enabled = true) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats', range],
    queryFn: async () => {
      const { data: raw } = await api.get<Record<string, unknown>>(
        '/dashboard/stats',
        {
          params: { range, days: range },
        }
      );

      const newThisWeek =
        raw.newThisWeek && typeof raw.newThisWeek === 'object'
          ? (raw.newThisWeek as { doctors?: number; patients?: number })
          : undefined;

      const rawPatientsPerDoctor = Array.isArray(raw.patientsPerDoctor)
        ? (raw.patientsPerDoctor as Record<string, unknown>[])
        : [];

      const patientsPerDoctor = rawPatientsPerDoctor.map((item, idx) => ({
        doctorId: String(item.doctorId || item._id || `doc-${idx}`),
        doctorName: String(item.doctorName || item.name || 'Doctor'),
        specialization: String(item.specialization || 'General'),
        count: Number(item.count ?? item.patientCount ?? 0),
      }));

      const rawPatientsOverTime = Array.isArray(raw.patientsOverTime)
        ? (raw.patientsOverTime as Record<string, unknown>[])
        : [];
      const patientsOverTime = rawPatientsOverTime.map((pt) => ({
        date: String(pt.date || ''),
        count: Number(pt.count ?? 0),
      }));

      const rawConditions = Array.isArray(raw.conditionBreakdown)
        ? (raw.conditionBreakdown as Record<string, unknown>[])
        : [];
      const totalConditionPatients = Math.max(
        1,
        rawConditions.reduce((sum, item) => sum + Number(item.count ?? 0), 0)
      );
      const conditionBreakdown = rawConditions.map((item) => {
        const count = Number(item.count ?? 0);
        const percentage =
          typeof item.percentage === 'number'
            ? item.percentage
            : Math.round((count / totalConditionPatients) * 100);
        return {
          condition: String(item.condition || 'Unspecified'),
          count,
          percentage,
        };
      });

      const rawDoctorsWeekly = Array.isArray(raw.doctorsAddedPerWeek)
        ? (raw.doctorsAddedPerWeek as Record<string, unknown>[])
        : Array.isArray(raw.doctorsOverTime)
        ? (raw.doctorsOverTime as Record<string, unknown>[])
        : [];

      const doctorsAddedPerWeek = rawDoctorsWeekly.map((pt) => ({
        week: String(pt.week || pt.date || ''),
        count: Number(pt.count ?? 0),
      }));

      return {
        range,
        totalDoctors: Number(raw.totalDoctors ?? 0),
        totalPatients: Number(raw.totalPatients ?? 0),
        newDoctorsThisWeek: Number(
          raw.newDoctorsThisWeek ?? newThisWeek?.doctors ?? 0
        ),
        newPatientsThisWeek: Number(
          raw.newPatientsThisWeek ?? newThisWeek?.patients ?? 0
        ),
        patientsPerDoctor,
        patientsOverTime,
        conditionBreakdown,
        doctorsAddedPerWeek,
      };
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useDoctorsPaginated(params: DoctorsQueryParams, enabled = true) {
  const {
    page,
    limit,
    search = '',
    specialization = 'ALL',
    hospital = 'ALL',
    from = '',
    to = '',
  } = params;

  return useQuery<PaginatedDoctorsResponse>({
    queryKey: [
      'doctors',
      'list',
      page,
      limit,
      search,
      specialization,
      hospital,
      from,
      to,
    ],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown> | Doctor[]>(
        '/doctors',
        {
          params: {
            page,
            limit,
            search: search || undefined,
            specialization:
              specialization && specialization !== 'ALL'
                ? specialization
                : undefined,
            hospital: hospital && hospital !== 'ALL' ? hospital : undefined,
            from: from || undefined,
            to: to || undefined,
            startDate: from || undefined,
            endDate: to || undefined,
          },
        }
      );

      if (Array.isArray(data)) {
        const normalized = data.map((d) => normalizeDoctor(d));
        const start = (page - 1) * limit;
        return {
          data: normalized.slice(start, start + limit),
          total: normalized.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(normalized.length / limit)),
          specializations: Array.from(
            new Set(normalized.map((d) => d.specialization))
          ).sort(),
          hospitals: Array.from(
            new Set(normalized.map((d) => d.hospital))
          ).sort(),
        };
      }

      const rawItems = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.items)
        ? data.items
        : [];
      const normalizedItems = rawItems.map((d) => normalizeDoctor(d));

      const pagination =
        data.pagination && typeof data.pagination === 'object'
          ? (data.pagination as {
              total?: number;
              page?: number;
              limit?: number;
              totalPages?: number;
            })
          : undefined;

      const total = Number(
        pagination?.total ?? data.total ?? normalizedItems.length
      );
      const resolvedPage = Number(pagination?.page ?? data.page ?? page);
      const resolvedLimit = Number(pagination?.limit ?? data.limit ?? limit);
      const totalPages = Number(
        pagination?.totalPages ??
          data.totalPages ??
          Math.max(1, Math.ceil(total / resolvedLimit))
      );

      const specializations = Array.isArray(data.specializations)
        ? (data.specializations as string[])
        : Array.from(
            new Set(normalizedItems.map((d) => d.specialization))
          ).sort();

      const hospitals = Array.isArray(data.hospitals)
        ? (data.hospitals as string[])
        : Array.from(new Set(normalizedItems.map((d) => d.hospital))).sort();

      return {
        data: normalizedItems,
        total,
        page: resolvedPage,
        limit: resolvedLimit,
        totalPages,
        specializations,
        hospitals,
      };
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useDoctors(enabled = true) {
  return useQuery<Doctor[]>({
    queryKey: ['doctors', 'all'],
    queryFn: async () => {
      const { data } = await api.get<Doctor[] | PaginatedDoctorsResponse>(
        '/doctors',
        { params: { limit: 100 } }
      );
      const rawList = Array.isArray(data) ? data : data.data || [];
      return rawList.map((d) => normalizeDoctor(d));
    },
    enabled,
  });
}

export function useDoctor(id: string, enabled = true) {
  return useQuery<Doctor>({
    queryKey: ['doctors', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<Doctor>(`/doctors/${id}`);
      return normalizeDoctor(data);
    },
    enabled: Boolean(id) && enabled,
  });
}

export function useDoctorPatients(
  params: DoctorPatientsQueryParams,
  enabled = true
) {
  const { doctorId, page, limit, search = '' } = params;

  return useQuery<PaginatedPatientsResponse>({
    queryKey: ['doctors', 'patients', doctorId, page, limit, search],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown> | Patient[]>(
        `/doctors/${doctorId}/patients`,
        {
          params: {
            page,
            limit,
            search: search || undefined,
          },
        }
      );

      if (Array.isArray(data)) {
        const normalized = data.map((p) => normalizePatient(p));
        const start = (page - 1) * limit;
        return {
          data: normalized.slice(start, start + limit),
          total: normalized.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(normalized.length / limit)),
        };
      }

      const rawItems = Array.isArray(data.data) ? data.data : [];
      const normalizedItems = rawItems.map((p) => normalizePatient(p));
      const pagination =
        data.pagination && typeof data.pagination === 'object'
          ? (data.pagination as {
              total?: number;
              page?: number;
              limit?: number;
              totalPages?: number;
            })
          : undefined;

      const total = Number(
        pagination?.total ?? data.total ?? normalizedItems.length
      );
      const resolvedPage = Number(pagination?.page ?? data.page ?? page);
      const resolvedLimit = Number(pagination?.limit ?? data.limit ?? limit);
      const totalPages = Number(
        pagination?.totalPages ??
          data.totalPages ??
          Math.max(1, Math.ceil(total / resolvedLimit))
      );

      return {
        data: normalizedItems,
        total,
        page: resolvedPage,
        limit: resolvedLimit,
        totalPages,
      };
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(doctorId) && enabled,
  });
}

export function usePatientsPaginated(params: PatientsQueryParams, enabled = true) {
  const {
    page,
    limit,
    search = '',
    condition = 'ALL',
    doctorId = 'ALL',
    from = '',
    to = '',
  } = params;

  return useQuery<PaginatedPatientsResponse>({
    queryKey: [
      'patients',
      'list',
      page,
      limit,
      search,
      condition,
      doctorId,
      from,
      to,
    ],
    queryFn: async () => {
      const resolvedDocParam =
        doctorId && doctorId !== 'ALL' ? doctorId : undefined;
      const { data } = await api.get<Record<string, unknown> | Patient[]>(
        '/patients',
        {
          params: {
            page,
            limit,
            search: search || undefined,
            condition:
              condition && condition !== 'ALL' ? condition : undefined,
            doctorId: resolvedDocParam,
            doctor: resolvedDocParam,
            from: from || undefined,
            to: to || undefined,
            startDate: from || undefined,
            endDate: to || undefined,
          },
        }
      );

      if (Array.isArray(data)) {
        const normalized = data.map((p) => normalizePatient(p));
        const start = (page - 1) * limit;
        return {
          data: normalized.slice(start, start + limit),
          total: normalized.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(normalized.length / limit)),
          conditions: Array.from(
            new Set(normalized.map((p) => p.condition))
          ).sort(),
        };
      }

      const rawItems = Array.isArray(data.data) ? data.data : [];
      const normalizedItems = rawItems.map((p) => normalizePatient(p));
      const pagination =
        data.pagination && typeof data.pagination === 'object'
          ? (data.pagination as {
              total?: number;
              page?: number;
              limit?: number;
              totalPages?: number;
            })
          : undefined;

      const total = Number(
        pagination?.total ?? data.total ?? normalizedItems.length
      );
      const resolvedPage = Number(pagination?.page ?? data.page ?? page);
      const resolvedLimit = Number(pagination?.limit ?? data.limit ?? limit);
      const totalPages = Number(
        pagination?.totalPages ??
          data.totalPages ??
          Math.max(1, Math.ceil(total / resolvedLimit))
      );

      return {
        data: normalizedItems,
        total,
        page: resolvedPage,
        limit: resolvedLimit,
        totalPages,
        conditions: Array.isArray(data.conditions)
          ? (data.conditions as string[])
          : undefined,
        doctors: Array.isArray(data.doctors)
          ? (data.doctors as { id: string; name: string }[])
          : undefined,
      };
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDoctorPayload | Partial<Doctor>) => {
      const { data } = await api.post<Doctor>('/doctors', payload);
      return normalizeDoctor(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/doctors/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePatients(enabled = true) {
  return useQuery<Patient[]>({
    queryKey: ['patients', 'all'],
    queryFn: async () => {
      const { data } = await api.get<Patient[] | PaginatedPatientsResponse>(
        '/patients',
        { params: { limit: 100 } }
      );
      const rawList = Array.isArray(data) ? data : data.data || [];
      return rawList.map((p) => normalizePatient(p));
    },
    enabled,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePatientPayload | Partial<Patient>) => {
      const doctorId =
        payload.doctorId || (payload as Partial<Patient>).assignedDoctorId;
      const endpoint = doctorId ? `/doctors/${doctorId}/patients` : '/patients';
      const { data } = await api.post<Patient>(endpoint, {
        ...payload,
        doctor: doctorId,
      });
      return normalizePatient(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePatientPayload;
    }) => {
      const { data } = await api.patch<Patient>(`/patients/${id}`, {
        ...payload,
        ...(payload.doctorId ? { doctor: payload.doctorId } : {}),
      });
      return normalizePatient(data);
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] });

      queryClient.setQueriesData<PaginatedPatientsResponse>(
        { queryKey: ['patients', 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((pat) =>
              pat.id === id
                ? {
                    ...pat,
                    ...payload,
                    fullName: payload.name || pat.fullName,
                    primaryDiagnosis: payload.condition || pat.primaryDiagnosis,
                    assignedDoctorId: payload.doctorId || pat.assignedDoctorId,
                    assignedDoctorName:
                      payload.doctorName || pat.assignedDoctorName,
                  }
                : pat
            ),
          };
        }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/patients/${id}`);
      return id;
    },
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] });
      await queryClient.cancelQueries({ queryKey: ['doctors', 'patients'] });

      queryClient.setQueriesData<PaginatedPatientsResponse>(
        { queryKey: ['patients', 'list'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((p) => p.id !== deletedId),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      queryClient.setQueriesData<PaginatedPatientsResponse>(
        { queryKey: ['doctors', 'patients'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((p) => p.id !== deletedId),
            total: Math.max(0, old.total - 1),
          };
        }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
