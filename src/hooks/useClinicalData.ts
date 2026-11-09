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

function normalizeDoctor(raw: Partial<Doctor> & Record<string, unknown>): Doctor {
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
    id: String(raw.id || `doc-${Date.now()}`),
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
    activePatientsCount: Number(raw.activePatientsCount ?? 0),
    todayAppointmentsCount: Number(raw.todayAppointmentsCount ?? 0),
    nextAvailableSlot: String(
      raw.nextAvailableSlot || new Date(Date.now() + 7200 * 1000).toISOString()
    ),
    joinedDate: String(raw.joinedDate || createdAt.slice(0, 10)),
  };
}

function normalizePatient(raw: Partial<Patient> & Record<string, unknown>): Patient {
  const name = String(raw.name || raw.fullName || 'Unknown Patient');
  const condition = String(
    raw.condition || raw.primaryDiagnosis || 'General Evaluation'
  );
  const doctorId = String(raw.doctorId || raw.assignedDoctorId || 'doc-101');
  const doctorName = String(
    raw.doctorName || raw.assignedDoctorName || 'Dr. Elena Rostova'
  );
  const lastVisitDate = String(
    raw.lastVisitDate || raw.createdAt || new Date().toISOString()
  );
  const age = Number(raw.age ?? 45);

  return {
    id: String(raw.id || `pat-${Date.now()}`),
    name,
    fullName: String(raw.fullName || name),
    mrn: String(raw.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`),
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
    department: String(raw.department || 'Cardiology'),
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
 */
export function useDashboardStats(range: DashboardRange = 30, enabled = true) {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats', range],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/dashboard/stats', {
        params: { range, days: range },
      });
      return data;
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
      const { data } = await api.get<
        PaginatedDoctorsResponse | Doctor[] | { items?: Doctor[]; total?: number }
      >('/doctors', {
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
        },
      });

      if (Array.isArray(data)) {
        const normalized = data.map((d) =>
          normalizeDoctor(d as Partial<Doctor> & Record<string, unknown>)
        );
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

      if ('data' in data && Array.isArray(data.data)) {
        return {
          ...data,
          data: data.data.map((d) =>
            normalizeDoctor(d as Partial<Doctor> & Record<string, unknown>)
          ),
        };
      }

      const items = ('items' in data && Array.isArray(data.items) ? data.items : []).map(
        (d) => normalizeDoctor(d as Partial<Doctor> & Record<string, unknown>)
      );
      const total =
        'total' in data && typeof data.total === 'number'
          ? data.total
          : items.length;

      return {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        specializations: Array.from(
          new Set(items.map((d) => d.specialization))
        ).sort(),
        hospitals: Array.from(new Set(items.map((d) => d.hospital))).sort(),
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
      const { data } = await api.get<Doctor[] | PaginatedDoctorsResponse>('/doctors');
      const rawList = Array.isArray(data) ? data : data.data || [];
      return rawList.map((d) =>
        normalizeDoctor(d as Partial<Doctor> & Record<string, unknown>)
      );
    },
    enabled,
  });
}

export function useDoctor(id: string, enabled = true) {
  return useQuery<Doctor>({
    queryKey: ['doctors', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<Doctor>(`/doctors/${id}`);
      return normalizeDoctor(data as Partial<Doctor> & Record<string, unknown>);
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
      const { data } = await api.get<
        PaginatedPatientsResponse | Patient[]
      >(`/doctors/${doctorId}/patients`, {
        params: {
          page,
          limit,
          search: search || undefined,
        },
      });

      if (Array.isArray(data)) {
        const normalized = data.map((p) =>
          normalizePatient(p as Partial<Patient> & Record<string, unknown>)
        );
        const start = (page - 1) * limit;
        return {
          data: normalized.slice(start, start + limit),
          total: normalized.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(normalized.length / limit)),
        };
      }

      return {
        ...data,
        data: (data.data || []).map((p) =>
          normalizePatient(p as Partial<Patient> & Record<string, unknown>)
        ),
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
      const { data } = await api.get<
        PaginatedPatientsResponse | Patient[]
      >('/patients', {
        params: {
          page,
          limit,
          search: search || undefined,
          condition: condition && condition !== 'ALL' ? condition : undefined,
          doctorId: doctorId && doctorId !== 'ALL' ? doctorId : undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });

      if (Array.isArray(data)) {
        const normalized = data.map((p) =>
          normalizePatient(p as Partial<Patient> & Record<string, unknown>)
        );
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

      return {
        ...data,
        data: (data.data || []).map((p) =>
          normalizePatient(p as Partial<Patient> & Record<string, unknown>)
        ),
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
      return normalizeDoctor(data as Partial<Doctor> & Record<string, unknown>);
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
        '/patients'
      );
      const rawList = Array.isArray(data) ? data : data.data || [];
      return rawList.map((p) =>
        normalizePatient(p as Partial<Patient> & Record<string, unknown>)
      );
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
      const { data } = await api.post<Patient>(endpoint, payload);
      return normalizePatient(data as Partial<Patient> & Record<string, unknown>);
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
      const { data } = await api.patch<Patient>(`/patients/${id}`, payload);
      return normalizePatient(data as Partial<Patient> & Record<string, unknown>);
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
