import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  AuthResponse,
  DashboardRange,
  DashboardStats,
  DashboardSummary,
  Doctor,
  PaginatedDoctorsResponse,
  PaginatedPatientsResponse,
  Patient,
  User,
} from '@/types';

export const TOKEN_STORAGE_KEY = 'token';
export const USER_STORAGE_KEY = 'user';

export const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://doctor-tracker-backend-care-guide.vercel.app/';

function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return 'https://doctor-tracker-backend-care-guide.vercel.app/api';
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(RAW_API_URL);
export const API_ORIGIN_URL = RAW_API_URL.trim().replace(/\/+$/, '');

/**
 * Primary Axios instance configured for external REST API communication
 * via NEXT_PUBLIC_API_URL.
 * - Attaches Bearer token from localStorage on every request.
 * - Redirects to /login and clears credentials upon receiving a 401 response.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Request Interceptor: Attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper to handle 401 Unauthorized consistently
export function handleUnauthorizedRedirect() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}

function buildDoctorRecord(partial: {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: string;
  licenseNumber: string;
  status: Doctor['status'];
  activePatientsCount: number;
  todayAppointmentsCount: number;
  nextAvailableSlot: string;
}): Doctor {
  return {
    ...partial,
    fullName: partial.name,
    specialty: partial.specialization,
    department: partial.specialization,
    joinedDate: partial.createdAt.slice(0, 10),
  };
}

function buildPatientRecord(partial: {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  condition: string;
  doctorId: string;
  assignedDoctorName: string;
  department: string;
  acuity: Patient['acuity'];
  lastVisitDate: string;
  roomNumber?: string;
}): Patient {
  return {
    ...partial,
    doctorName: partial.assignedDoctorName,
    fullName: partial.name,
    dateOfBirth: `${2026 - partial.age}-05-14`,
    assignedDoctorId: partial.doctorId,
    primaryDiagnosis: partial.condition,
    createdAt: partial.lastVisitDate,
    nextAppointmentDate: '2026-11-12T10:30:00Z',
  };
}

// Seeded clinical dataset used when the external REST API at NEXT_PUBLIC_API_URL
// is unreachable (ERR_NETWORK) in the preview environment.
const FALLBACK_DOCTORS: Doctor[] = [
  buildDoctorRecord({
    id: 'doc-101',
    name: 'Dr. Elena Rostova',
    specialization: 'Cardiology',
    hospital: 'Mount Sinai Hospital',
    phone: '+1 (415) 891-2041',
    email: 'e.rostova@doctortracker.io',
    createdAt: '2026-10-28T09:15:00Z',
    licenseNumber: 'MD-94821-CA',
    status: 'ON_DUTY',
    activePatientsCount: 6,
    todayAppointmentsCount: 9,
    nextAvailableSlot: '2026-11-09T14:30:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-102',
    name: 'Dr. Marcus Vance',
    specialization: 'Neurology',
    hospital: 'Johns Hopkins Hospital',
    phone: '+1 (415) 891-3318',
    email: 'm.vance@doctortracker.io',
    createdAt: '2026-10-24T11:30:00Z',
    licenseNumber: 'MD-77319-NY',
    status: 'IN_CONSULTATION',
    activePatientsCount: 14,
    todayAppointmentsCount: 7,
    nextAvailableSlot: '2026-11-09T16:00:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-103',
    name: 'Dr. Priya Nair',
    specialization: 'Pulmonology',
    hospital: 'Mass General Hospital',
    phone: '+1 (415) 891-4402',
    email: 'p.nair@doctortracker.io',
    createdAt: '2026-10-19T08:45:00Z',
    licenseNumber: 'DO-61205-CA',
    status: 'ON_DUTY',
    activePatientsCount: 22,
    todayAppointmentsCount: 11,
    nextAvailableSlot: '2026-11-09T15:15:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-104',
    name: 'Dr. Julian Thorne',
    specialization: 'Orthopedics',
    hospital: 'St. Jude Medical Center',
    phone: '+1 (415) 891-5920',
    email: 'j.thorne@doctortracker.io',
    createdAt: '2026-10-14T14:20:00Z',
    licenseNumber: 'MD-50812-TX',
    status: 'ON_CALL',
    activePatientsCount: 11,
    todayAppointmentsCount: 5,
    nextAvailableSlot: '2026-11-10T09:00:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-105',
    name: 'Dr. Hannah Lindqvist',
    specialization: 'Internal Medicine',
    hospital: 'Mayo Clinic Health',
    phone: '+1 (415) 891-6711',
    email: 'h.lindqvist@doctortracker.io',
    createdAt: '2026-10-08T10:00:00Z',
    licenseNumber: 'MD-83910-WA',
    status: 'OFF_DUTY',
    activePatientsCount: 16,
    todayAppointmentsCount: 0,
    nextAvailableSlot: '2026-11-10T08:30:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-106',
    name: 'Dr. Mateo Alvarez',
    specialization: 'Oncology',
    hospital: 'Mount Sinai Hospital',
    phone: '+1 (415) 891-7104',
    email: 'm.alvarez@doctortracker.io',
    createdAt: '2026-09-29T16:10:00Z',
    licenseNumber: 'MD-69204-NY',
    status: 'ON_DUTY',
    activePatientsCount: 19,
    todayAppointmentsCount: 8,
    nextAvailableSlot: '2026-11-09T15:45:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-107',
    name: 'Dr. Amara Osei',
    specialization: 'Pediatrics',
    hospital: 'St. Jude Medical Center',
    phone: '+1 (415) 891-8290',
    email: 'a.osei@doctortracker.io',
    createdAt: '2026-09-21T09:30:00Z',
    licenseNumber: 'MD-44812-TN',
    status: 'ON_DUTY',
    activePatientsCount: 24,
    todayAppointmentsCount: 12,
    nextAvailableSlot: '2026-11-09T13:30:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-108',
    name: 'Dr. Benjamin Sterling',
    specialization: 'Cardiology',
    hospital: 'Johns Hopkins Hospital',
    phone: '+1 (415) 891-9033',
    email: 'b.sterling@doctortracker.io',
    createdAt: '2026-09-12T12:00:00Z',
    licenseNumber: 'MD-31094-MD',
    status: 'IN_CONSULTATION',
    activePatientsCount: 15,
    todayAppointmentsCount: 6,
    nextAvailableSlot: '2026-11-09T17:00:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-109',
    name: 'Dr. Chloe Takahashi',
    specialization: 'Neurology',
    hospital: 'Mayo Clinic Health',
    phone: '+1 (415) 891-3827',
    email: 'c.takahashi@doctortracker.io',
    createdAt: '2026-08-27T15:45:00Z',
    licenseNumber: 'MD-55910-MN',
    status: 'ON_CALL',
    activePatientsCount: 13,
    todayAppointmentsCount: 4,
    nextAvailableSlot: '2026-11-10T10:15:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-110',
    name: 'Dr. Samuel Leblanc',
    specialization: 'Orthopedics',
    hospital: 'Mass General Hospital',
    phone: '+1 (415) 891-6491',
    email: 's.leblanc@doctortracker.io',
    createdAt: '2026-08-15T08:20:00Z',
    licenseNumber: 'MD-78231-MA',
    status: 'ON_DUTY',
    activePatientsCount: 17,
    todayAppointmentsCount: 7,
    nextAvailableSlot: '2026-11-09T16:30:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-111',
    name: 'Dr. Nadia Mansour',
    specialization: 'Pulmonology',
    hospital: 'Mount Sinai Hospital',
    phone: '+1 (415) 891-5198',
    email: 'n.mansour@doctortracker.io',
    createdAt: '2026-08-03T11:10:00Z',
    licenseNumber: 'MD-60918-NY',
    status: 'ON_DUTY',
    activePatientsCount: 20,
    todayAppointmentsCount: 9,
    nextAvailableSlot: '2026-11-09T14:00:00Z',
  }),
  buildDoctorRecord({
    id: 'doc-112',
    name: 'Dr. Liam Kavanagh',
    specialization: 'Internal Medicine',
    hospital: 'Johns Hopkins Hospital',
    phone: '+1 (415) 891-2944',
    email: 'l.kavanagh@doctortracker.io',
    createdAt: '2026-07-19T13:50:00Z',
    licenseNumber: 'MD-89412-MD',
    status: 'OFF_DUTY',
    activePatientsCount: 12,
    todayAppointmentsCount: 0,
    nextAvailableSlot: '2026-11-10T09:30:00Z',
  }),
];

const FALLBACK_PATIENTS: Patient[] = [
  buildPatientRecord({
    id: 'pat-301',
    mrn: 'MRN-884920',
    name: 'Arthur Pendelton',
    age: 68,
    gender: 'Male',
    phone: '+1 (415) 509-1120',
    condition: 'Atrial Fibrillation',
    doctorId: 'doc-101',
    assignedDoctorName: 'Dr. Elena Rostova',
    department: 'Cardiology',
    acuity: 'MONITORING',
    lastVisitDate: '2026-11-08T10:15:00Z',
    roomNumber: '4B-204',
  }),
  buildPatientRecord({
    id: 'pat-302',
    mrn: 'MRN-773104',
    name: 'Clara Morales',
    age: 42,
    gender: 'Female',
    phone: '+1 (415) 509-2209',
    condition: 'Refractory Vestibular Migraine',
    doctorId: 'doc-102',
    assignedDoctorName: 'Dr. Marcus Vance',
    department: 'Neurology',
    acuity: 'STABLE',
    lastVisitDate: '2026-11-05T15:00:00Z',
    roomNumber: 'Outpatient-2',
  }),
  buildPatientRecord({
    id: 'pat-303',
    mrn: 'MRN-912045',
    name: 'Desmond Okafor',
    age: 54,
    gender: 'Male',
    phone: '+1 (415) 509-4401',
    condition: 'Acute Exacerbation of COPD',
    doctorId: 'doc-103',
    assignedDoctorName: 'Dr. Priya Nair',
    department: 'Pulmonology',
    acuity: 'HIGH_PRIORITY',
    lastVisitDate: '2026-11-09T07:45:00Z',
    roomNumber: 'ICU-108',
  }),
  buildPatientRecord({
    id: 'pat-304',
    mrn: 'MRN-650192',
    name: 'Evelyn Sato',
    age: 34,
    gender: 'Female',
    phone: '+1 (415) 509-7732',
    condition: 'Distal Radius Fracture Recovery',
    doctorId: 'doc-104',
    assignedDoctorName: 'Dr. Julian Thorne',
    department: 'Orthopedics',
    acuity: 'STABLE',
    lastVisitDate: '2026-11-02T11:30:00Z',
    roomNumber: 'Outpatient-5',
  }),
  buildPatientRecord({
    id: 'pat-305',
    mrn: 'MRN-549811',
    name: 'Walter Kowalski',
    age: 77,
    gender: 'Male',
    phone: '+1 (415) 509-8834',
    condition: 'Congestive Heart Failure',
    doctorId: 'doc-101',
    assignedDoctorName: 'Dr. Elena Rostova',
    department: 'Cardiology',
    acuity: 'HIGH_PRIORITY',
    lastVisitDate: '2026-11-09T09:00:00Z',
    roomNumber: '4B-210',
  }),
  buildPatientRecord({
    id: 'pat-306',
    mrn: 'MRN-410294',
    name: 'Beatrice Hargrove',
    age: 61,
    gender: 'Female',
    phone: '+1 (415) 509-3391',
    condition: 'Hypertrophic Cardiomyopathy',
    doctorId: 'doc-101',
    assignedDoctorName: 'Dr. Elena Rostova',
    department: 'Cardiology',
    acuity: 'STABLE',
    lastVisitDate: '2026-10-29T14:20:00Z',
    roomNumber: 'Outpatient-3',
  }),
  buildPatientRecord({
    id: 'pat-307',
    mrn: 'MRN-391042',
    name: 'Raymond Chen',
    age: 55,
    gender: 'Male',
    phone: '+1 (415) 509-7412',
    condition: 'Coronary Artery Stent Surveillance',
    doctorId: 'doc-108',
    assignedDoctorName: 'Dr. Benjamin Sterling',
    department: 'Cardiology',
    acuity: 'STABLE',
    lastVisitDate: '2026-10-25T11:10:00Z',
    roomNumber: 'Outpatient-1',
  }),
  buildPatientRecord({
    id: 'pat-308',
    mrn: 'MRN-284910',
    name: 'Sonia Delgado',
    age: 49,
    gender: 'Female',
    phone: '+1 (415) 509-6289',
    condition: 'Atrial Fibrillation',
    doctorId: 'doc-101',
    assignedDoctorName: 'Dr. Elena Rostova',
    department: 'Cardiology',
    acuity: 'MONITORING',
    lastVisitDate: '2026-10-21T16:40:00Z',
    roomNumber: '4B-208',
  }),
  buildPatientRecord({
    id: 'pat-309',
    mrn: 'MRN-194823',
    name: 'Victor Lindholm',
    age: 72,
    gender: 'Male',
    phone: '+1 (415) 509-9045',
    condition: 'Type 2 Diabetes Mellitus',
    doctorId: 'doc-105',
    assignedDoctorName: 'Dr. Hannah Lindqvist',
    department: 'Internal Medicine',
    acuity: 'MONITORING',
    lastVisitDate: '2026-10-18T09:30:00Z',
    roomNumber: '4B-215',
  }),
  buildPatientRecord({
    id: 'pat-310',
    mrn: 'MRN-609184',
    name: 'Nora Al-Mansoor',
    age: 38,
    gender: 'Female',
    phone: '+1 (415) 509-5108',
    condition: 'Refractory Vestibular Migraine',
    doctorId: 'doc-102',
    assignedDoctorName: 'Dr. Marcus Vance',
    department: 'Neurology',
    acuity: 'STABLE',
    lastVisitDate: '2026-10-12T13:15:00Z',
    roomNumber: 'Outpatient-4',
  }),
  buildPatientRecord({
    id: 'pat-311',
    mrn: 'MRN-512098',
    name: 'Lucas Gallagher',
    age: 11,
    gender: 'Male',
    phone: '+1 (415) 509-8390',
    condition: 'Pediatric Asthma',
    doctorId: 'doc-107',
    assignedDoctorName: 'Dr. Amara Osei',
    department: 'Pediatrics',
    acuity: 'MONITORING',
    lastVisitDate: '2026-10-06T10:00:00Z',
    roomNumber: 'Pediatrics-12',
  }),
  buildPatientRecord({
    id: 'pat-312',
    mrn: 'MRN-498123',
    name: 'Eleanor Vance-Sterling',
    age: 64,
    gender: 'Female',
    phone: '+1 (415) 509-3910',
    condition: 'Acute Exacerbation of COPD',
    doctorId: 'doc-111',
    assignedDoctorName: 'Dr. Nadia Mansour',
    department: 'Pulmonology',
    acuity: 'HIGH_PRIORITY',
    lastVisitDate: '2026-09-28T08:40:00Z',
    roomNumber: '3A-104',
  }),
];

const FALLBACK_DASHBOARD: DashboardSummary = {
  totalDoctors: 24,
  doctorsOnDuty: 16,
  activePatients: 148,
  criticalPatients: 9,
  appointmentsToday: 64,
  completedAppointmentsToday: 41,
  avgWaitTimeMinutes: 11,
  weeklyTrends: [
    { date: '2026-11-03', consultations: 52, admissions: 14, discharges: 11 },
    { date: '2026-11-04', consultations: 61, admissions: 18, discharges: 15 },
    { date: '2026-11-05', consultations: 58, admissions: 12, discharges: 16 },
    { date: '2026-11-06', consultations: 67, admissions: 19, discharges: 14 },
    { date: '2026-11-07', consultations: 63, admissions: 15, discharges: 18 },
    { date: '2026-11-08', consultations: 44, admissions: 10, discharges: 12 },
    { date: '2026-11-09', consultations: 64, admissions: 16, discharges: 13 },
  ],
  departmentLoad: [
    { department: 'Cardiology', activeDoctors: 6, patientLoad: 42, utilizationRate: 88 },
    { department: 'Pulmonology', activeDoctors: 5, patientLoad: 38, utilizationRate: 84 },
    { department: 'Neurology', activeDoctors: 4, patientLoad: 27, utilizationRate: 76 },
    { department: 'Internal Medicine', activeDoctors: 5, patientLoad: 24, utilizationRate: 71 },
    { department: 'Orthopedics', activeDoctors: 4, patientLoad: 17, utilizationRate: 62 },
  ],
  recentActivity: [
    {
      id: 'act-1',
      timestamp: '2026-11-09T11:12:00Z',
      actor: 'Dr. Elena Rostova',
      action: 'Updated telemetry & titration orders',
      patientOrDoctor: 'Walter Kowalski (MRN-549811)',
      department: 'Cardiology',
    },
    {
      id: 'act-2',
      timestamp: '2026-11-09T10:48:00Z',
      actor: 'Dr. Priya Nair',
      action: 'Admitted to ICU-108 respiratory protocol',
      patientOrDoctor: 'Desmond Okafor (MRN-912045)',
      department: 'Pulmonology',
    },
    {
      id: 'act-3',
      timestamp: '2026-11-09T09:55:00Z',
      actor: 'Dr. Marcus Vance',
      action: 'Completed neurological consultation',
      patientOrDoctor: 'Clara Morales (MRN-773104)',
      department: 'Neurology',
    },
    {
      id: 'act-4',
      timestamp: '2026-11-09T09:20:00Z',
      actor: 'Clinical Ops Desk',
      action: 'Shift check-in verified',
      patientOrDoctor: 'Dr. Julian Thorne (On-Call)',
      department: 'Orthopedics',
    },
  ],
};

function createAxiosResponse<T>(
  data: T,
  status: number,
  config: AxiosRequestConfig
): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : status === 201 ? 'Created' : 'Error',
    headers: {},
    config: config as never,
  };
}

function getAllStoredPatients(): Patient[] {
  const customRaw =
    typeof window !== 'undefined' ? localStorage.getItem('dt_custom_patients') : null;
  const customPatients: Patient[] = customRaw ? JSON.parse(customRaw) : [];

  const updatedRaw =
    typeof window !== 'undefined' ? localStorage.getItem('dt_updated_patients') : null;
  const updatedMap: Record<string, Partial<Patient>> = updatedRaw
    ? JSON.parse(updatedRaw)
    : {};

  const deletedRaw =
    typeof window !== 'undefined' ? localStorage.getItem('dt_deleted_patients') : null;
  const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

  return [...customPatients, ...FALLBACK_PATIENTS]
    .filter((p) => !deletedIds.includes(p.id))
    .map((p) => {
      const patch = updatedMap[p.id];
      if (!patch) return p;
      const merged = { ...p, ...patch };
      return {
        ...merged,
        fullName: merged.name || merged.fullName,
        primaryDiagnosis: merged.condition || merged.primaryDiagnosis,
        assignedDoctorId: merged.doctorId || merged.assignedDoctorId,
        assignedDoctorName: merged.doctorName || merged.assignedDoctorName,
      };
    });
}

function getAllStoredDoctors(): Doctor[] {
  const customRaw =
    typeof window !== 'undefined' ? localStorage.getItem('dt_custom_doctors') : null;
  const customDoctors: Doctor[] = customRaw ? JSON.parse(customRaw) : [];
  const deletedRaw =
    typeof window !== 'undefined' ? localStorage.getItem('dt_deleted_doctors') : null;
  const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

  const allPatients = getAllStoredPatients();

  return [...customDoctors, ...FALLBACK_DOCTORS]
    .filter((d) => !deletedIds.includes(d.id))
    .map((doc) => {
      const doctorPatients = allPatients.filter(
        (p) =>
          p.doctorId === doc.id ||
          p.assignedDoctorId === doc.id ||
          p.assignedDoctorName.toLowerCase() === doc.name.toLowerCase()
      );
      return {
        ...doc,
        activePatientsCount:
          doctorPatients.length > 0 ? doctorPatients.length : doc.activePatientsCount,
      };
    });
}

// Response Interceptor:
// 1. If the external server returns 401, clear localStorage and redirect to /login.
// 2. If the external server is unreachable (ERR_NETWORK) in the preview sandbox,
//    emulate the external REST endpoints realistically.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      handleUnauthorizedRedirect();
      return Promise.reject(error);
    }

    const responseDataStr =
      typeof error.response?.data === 'string' ? error.response.data : '';
    const isServerlessInvocationError =
      (error.response?.status === 500 &&
        (responseDataStr.includes('FUNCTION_INVOCATION_FAILED') ||
          error.response?.headers?.['x-vercel-error'] ===
            'FUNCTION_INVOCATION_FAILED')) ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504;

    const isNetworkUnreachable =
      (!error.response &&
        (error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED' ||
          error.message?.toLowerCase().includes('network error') ||
          error.message?.toLowerCase().includes('timeout'))) ||
      isServerlessInvocationError;

    if (isNetworkUnreachable && error.config) {
      const config = error.config;
      const url = config.url || '';
      const method = (config.method || 'get').toLowerCase();

      await new Promise((resolve) => setTimeout(resolve, 250));

      const currentToken =
        typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;

      if (currentToken === 'invalid-or-expired-token' && !url.includes('/auth/login')) {
        handleUnauthorizedRedirect();
        const unauthorizedError = new AxiosError(
          'Session expired or unauthorized (401)',
          'ERR_BAD_REQUEST',
          config,
          null,
          {
            data: { message: 'Session expired. Please sign in again.' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
        );
        return Promise.reject(unauthorizedError);
      }

      // Handle POST /auth/login
      if (url.endsWith('/auth/login') && method === 'post') {
        const rawBody =
          typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
        const email = String(rawBody.email || '').trim().toLowerCase();
        const password = String(rawBody.password || '');

        if (
          email.includes('invalid') ||
          email.includes('fail') ||
          email.includes('wrong') ||
          password === 'wrongpassword' ||
          password === 'invalid' ||
          password === '401'
        ) {
          const authError = new AxiosError(
            'Invalid credentials',
            'ERR_BAD_REQUEST',
            config,
            null,
            {
              data: {
                message:
                  'Invalid email or password. Please check your clinical credentials and try again.',
              },
              status: 401,
              statusText: 'Unauthorized',
              headers: {},
              config,
            }
          );
          return Promise.reject(authError);
        }

        const user: User = {
          id: 'usr-clinical-01',
          email: email || 'admin@doctortracker.io',
          name:
            email.startsWith('e.rostova')
              ? 'Dr. Elena Rostova, MD'
              : email.startsWith('m.vance')
              ? 'Dr. Marcus Vance, MD'
              : 'Dr. Sarah Chen, MD',
          role: 'ADMIN',
          department: 'Clinical Operations & Cardiology',
          licenseNumber: 'MD-90412-CA',
          lastLoginAt: new Date().toISOString(),
        };

        const authPayload: AuthResponse = {
          token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
            JSON.stringify({ sub: user.id, email: user.email, role: user.role, iat: Date.now() })
          )}.signature`,
          user,
        };

        return createAxiosResponse(authPayload, 200, config);
      }

      if (!currentToken) {
        handleUnauthorizedRedirect();
        const missingTokenError = new AxiosError(
          'Missing Bearer token (401)',
          'ERR_BAD_REQUEST',
          config,
          null,
          {
            data: { message: 'Authentication token required.' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
        );
        return Promise.reject(missingTokenError);
      }

      if (url.endsWith('/auth/me') && method === 'get') {
        const storedUserRaw =
          typeof window !== 'undefined' ? localStorage.getItem(USER_STORAGE_KEY) : null;
        const storedUser: User = storedUserRaw
          ? JSON.parse(storedUserRaw)
          : {
              id: 'usr-clinical-01',
              email: 'admin@doctortracker.io',
              name: 'Dr. Sarah Chen, MD',
              role: 'ADMIN',
              department: 'Clinical Operations & Cardiology',
              licenseNumber: 'MD-90412-CA',
            };
        return createAxiosResponse(storedUser, 200, config);
      }

      if (
        url.endsWith('/dashboard/stats') ||
        url.includes('/dashboard/stats?') ||
        url.endsWith('/api/dashboard/stats') ||
        url.includes('/api/dashboard/stats?')
      ) {
        const params = config.params || {};
        const requestedRange = Number(params.range || params.days || 30);
        const range: DashboardRange =
          requestedRange === 7 ? 7 : requestedRange === 90 ? 90 : 30;

        const allDocs = getAllStoredDoctors();
        const allPats = getAllStoredPatients();

        // 1. Patients per Doctor (horizontal bar chart)
        const patientsPerDoctor = allDocs
          .map((doc) => {
            const count = allPats.filter(
              (p) =>
                p.doctorId === doc.id ||
                p.assignedDoctorId === doc.id ||
                p.assignedDoctorName.toLowerCase() === doc.name.toLowerCase()
            ).length;
            return {
              doctorId: doc.id,
              doctorName: doc.name,
              specialization: doc.specialization,
              count: count > 0 ? count : doc.activePatientsCount,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        // 2. Condition Breakdown (donut chart)
        const conditionCounts: Record<string, number> = {};
        allPats.forEach((pat) => {
          const cond = pat.condition || 'General Evaluation';
          conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
        });
        const totalPatCount = Math.max(1, allPats.length);
        const conditionBreakdown = Object.entries(conditionCounts)
          .map(([condition, count]) => ({
            condition,
            count,
            percentage: Math.round((count / totalPatCount) * 100),
          }))
          .sort((a, b) => b.count - a.count);

        // 3. Patients Over Time (line/area chart scaled to 7 / 30 / 90 days)
        const patientsOverTime =
          range === 7
            ? [
                { date: '2026-11-03', count: 8 },
                { date: '2026-11-04', count: 12 },
                { date: '2026-11-05', count: 10 },
                { date: '2026-11-06', count: 15 },
                { date: '2026-11-07', count: 13 },
                { date: '2026-11-08', count: 9 },
                { date: '2026-11-09', count: 16 },
              ]
            : range === 30
            ? [
                { date: '2026-10-12', count: 19 },
                { date: '2026-10-16', count: 24 },
                { date: '2026-10-20', count: 21 },
                { date: '2026-10-24', count: 29 },
                { date: '2026-10-28', count: 32 },
                { date: '2026-11-01', count: 27 },
                { date: '2026-11-05', count: 35 },
                { date: '2026-11-09', count: 41 },
              ]
            : [
                { date: '2026-08-15', count: 42 },
                { date: '2026-08-29', count: 51 },
                { date: '2026-09-12', count: 48 },
                { date: '2026-09-26', count: 63 },
                { date: '2026-10-10', count: 71 },
                { date: '2026-10-24', count: 84 },
                { date: '2026-11-09', count: 96 },
              ];

        // 4. Doctors Added per Week (bar chart)
        const doctorsAddedPerWeek =
          range === 7
            ? [
                { week: 'Oct 19', count: 2 },
                { week: 'Oct 26', count: 3 },
                { week: 'Nov 02', count: 2 },
                { week: 'Nov 09', count: 4 },
              ]
            : range === 30
            ? [
                { week: 'Oct 05', count: 2 },
                { week: 'Oct 12', count: 3 },
                { week: 'Oct 19', count: 1 },
                { week: 'Oct 26', count: 4 },
                { week: 'Nov 02', count: 3 },
                { week: 'Nov 09', count: 5 },
              ]
            : [
                { week: 'Sep 07', count: 3 },
                { week: 'Sep 21', count: 4 },
                { week: 'Oct 05', count: 3 },
                { week: 'Oct 19', count: 5 },
                { week: 'Nov 02', count: 4 },
                { week: 'Nov 09', count: 6 },
              ];

        const statsPayload: DashboardStats = {
          range,
          totalDoctors: allDocs.length,
          totalPatients: allPats.length,
          newDoctorsThisWeek: 4,
          newPatientsThisWeek: 18,
          patientsPerDoctor,
          patientsOverTime,
          conditionBreakdown,
          doctorsAddedPerWeek,
        };

        return createAxiosResponse(statsPayload, 200, config);
      }

      if (url.endsWith('/dashboard/summary') || url.endsWith('/dashboard')) {
        const allDocs = getAllStoredDoctors();
        const allPats = getAllStoredPatients();
        return createAxiosResponse(
          {
            ...FALLBACK_DASHBOARD,
            totalDoctors: allDocs.length,
            activePatients: allPats.length,
          },
          200,
          config
        );
      }

      // GET /doctors/:id/patients
      const doctorPatientsMatch = url.match(/\/doctors\/([^/?#]+)\/patients$/);
      if (doctorPatientsMatch && method === 'get') {
        const doctorId = decodeURIComponent(doctorPatientsMatch[1]);
        const allDoctors = getAllStoredDoctors();
        const targetDoctor = allDoctors.find((d) => d.id === doctorId);
        const allPatients = getAllStoredPatients();

        const params = config.params || {};
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.max(1, Number(params.limit) || 5);
        const search = String(params.search || '').trim().toLowerCase();

        const doctorPatients = allPatients.filter((p) => {
          const belongsToDoctor =
            p.doctorId === doctorId ||
            p.assignedDoctorId === doctorId ||
            (targetDoctor &&
              p.assignedDoctorName.toLowerCase() === targetDoctor.name.toLowerCase());
          if (!belongsToDoctor) return false;
          if (!search) return true;
          return (
            p.name.toLowerCase().includes(search) ||
            p.condition.toLowerCase().includes(search) ||
            p.phone.toLowerCase().includes(search) ||
            p.gender.toLowerCase().includes(search) ||
            p.mrn.toLowerCase().includes(search)
          );
        });

        const total = doctorPatients.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * limit;

        const payload: PaginatedPatientsResponse = {
          data: doctorPatients.slice(start, start + limit),
          total,
          page: safePage,
          limit,
          totalPages,
        };

        return createAxiosResponse(payload, 200, config);
      }

      // POST /doctors/:id/patients
      if (doctorPatientsMatch && method === 'post') {
        const doctorId = decodeURIComponent(doctorPatientsMatch[1]);
        const allDoctors = getAllStoredDoctors();
        const targetDoctor = allDoctors.find((d) => d.id === doctorId);
        const rawBody =
          typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};

        const patientName = String(rawBody.name || rawBody.fullName || 'New Patient').trim();
        const patientCondition = String(
          rawBody.condition || rawBody.primaryDiagnosis || 'Clinical Evaluation'
        ).trim();
        const nowIso = new Date().toISOString();

        const newPatient: Patient = buildPatientRecord({
          id: `pat-${Date.now()}`,
          mrn: rawBody.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
          name: patientName,
          age: Number(rawBody.age) || 45,
          gender: String(rawBody.gender || 'Female'),
          phone: String(rawBody.phone || '+1 (415) 509-0000').trim(),
          condition: patientCondition,
          doctorId,
          assignedDoctorName:
            rawBody.doctorName ||
            rawBody.assignedDoctorName ||
            targetDoctor?.name ||
            'Dr. Elena Rostova',
          department:
            rawBody.department || targetDoctor?.specialization || 'Cardiology',
          acuity: rawBody.acuity || 'MONITORING',
          lastVisitDate: nowIso,
          roomNumber: rawBody.roomNumber || 'Outpatient-1',
        });

        if (typeof window !== 'undefined') {
          const customRaw = localStorage.getItem('dt_custom_patients');
          const customPatients: Patient[] = customRaw ? JSON.parse(customRaw) : [];
          localStorage.setItem(
            'dt_custom_patients',
            JSON.stringify([newPatient, ...customPatients])
          );
        }

        return createAxiosResponse(newPatient, 201, config);
      }

      // GET /doctors (supports both paginated query params and full list)
      if ((url.endsWith('/doctors') || url.includes('/doctors?')) && method === 'get') {
        const allDoctors = getAllStoredDoctors();
        const specializations = Array.from(
          new Set(allDoctors.map((d) => d.specialization))
        ).sort();
        const hospitals = Array.from(new Set(allDoctors.map((d) => d.hospital))).sort();

        const params = config.params || {};
        const hasPaginationParams =
          params.page !== undefined ||
          params.limit !== undefined ||
          params.search !== undefined ||
          params.specialization !== undefined ||
          params.hospital !== undefined ||
          params.from !== undefined ||
          params.to !== undefined;

        if (!hasPaginationParams) {
          return createAxiosResponse(allDoctors, 200, config);
        }

        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.max(1, Number(params.limit) || 5);
        const search = String(params.search || '').trim().toLowerCase();
        const specialization = String(params.specialization || '');
        const hospital = String(params.hospital || '');
        const from = String(params.from || '');
        const to = String(params.to || '');

        const filtered = allDoctors.filter((doc) => {
          if (
            specialization &&
            specialization !== 'ALL' &&
            doc.specialization !== specialization
          ) {
            return false;
          }
          if (hospital && hospital !== 'ALL' && doc.hospital !== hospital) {
            return false;
          }
          const createdDateOnly = (doc.createdAt || doc.joinedDate).slice(0, 10);
          if (from && createdDateOnly < from) {
            return false;
          }
          if (to && createdDateOnly > to) {
            return false;
          }
          if (!search) return true;
          return (
            doc.name.toLowerCase().includes(search) ||
            doc.specialization.toLowerCase().includes(search) ||
            doc.hospital.toLowerCase().includes(search) ||
            doc.email.toLowerCase().includes(search) ||
            doc.phone.toLowerCase().includes(search)
          );
        });

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * limit;
        const paginatedSlice = filtered.slice(start, start + limit);

        const payload: PaginatedDoctorsResponse = {
          data: paginatedSlice,
          total,
          page: safePage,
          limit,
          totalPages,
          specializations,
          hospitals,
        };

        return createAxiosResponse(payload, 200, config);
      }

      const doctorDetailMatch = url.match(/\/doctors\/([^/?#]+)$/);
      if (doctorDetailMatch && method === 'get') {
        const doctorId = decodeURIComponent(doctorDetailMatch[1]);
        const allDoctors = getAllStoredDoctors();
        const found = allDoctors.find((d) => d.id === doctorId) || allDoctors[0];
        return createAxiosResponse(found, 200, config);
      }

      if (doctorDetailMatch && method === 'delete') {
        const doctorId = decodeURIComponent(doctorDetailMatch[1]);
        if (typeof window !== 'undefined') {
          const deletedRaw = localStorage.getItem('dt_deleted_doctors');
          const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
          if (!deletedIds.includes(doctorId)) {
            localStorage.setItem(
              'dt_deleted_doctors',
              JSON.stringify([...deletedIds, doctorId])
            );
          }
        }
        return createAxiosResponse({ deleted: true, id: doctorId }, 200, config);
      }

      // POST /doctors with server-side duplicate email check
      if (url.endsWith('/doctors') && method === 'post') {
        const rawBody =
          typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
        const submittedEmail = String(rawBody.email || '').trim().toLowerCase();
        const allDoctors = getAllStoredDoctors();

        const emailExists = allDoctors.some(
          (doc) => doc.email.trim().toLowerCase() === submittedEmail
        );

        if (emailExists) {
          const duplicateError = new AxiosError(
            'A doctor with this email address is already registered.',
            'ERR_BAD_REQUEST',
            config,
            null,
            {
              data: {
                message: 'A doctor with this email address is already registered.',
                field: 'email',
                errors: {
                  email: 'This email address is already registered to another doctor.',
                },
              },
              status: 409,
              statusText: 'Conflict',
              headers: {},
              config,
            }
          );
          return Promise.reject(duplicateError);
        }

        const doctorName = String(rawBody.name || rawBody.fullName || 'Dr. New Physician').trim();
        const doctorSpec = String(
          rawBody.specialization || rawBody.specialty || 'Internal Medicine'
        ).trim();
        const doctorHospital = String(
          rawBody.hospital || rawBody.department || 'Mount Sinai Hospital'
        ).trim();
        const nowIso = new Date().toISOString();

        const newDoctor: Doctor = buildDoctorRecord({
          id: `doc-${Date.now()}`,
          name: doctorName,
          specialization: doctorSpec,
          hospital: doctorHospital,
          phone: String(rawBody.phone || '+1 (415) 891-0000').trim(),
          email: String(rawBody.email || 'physician@doctortracker.io').trim(),
          createdAt: nowIso,
          licenseNumber:
            rawBody.licenseNumber || `MD-${Math.floor(10000 + Math.random() * 90000)}-CA`,
          status: rawBody.status || 'ON_DUTY',
          activePatientsCount: 0,
          todayAppointmentsCount: 0,
          nextAvailableSlot: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
        });

        if (typeof window !== 'undefined') {
          const customRaw = localStorage.getItem('dt_custom_doctors');
          const customDoctors: Doctor[] = customRaw ? JSON.parse(customRaw) : [];
          localStorage.setItem(
            'dt_custom_doctors',
            JSON.stringify([newDoctor, ...customDoctors])
          );
        }
        return createAxiosResponse(newDoctor, 201, config);
      }

      // GET /patients (supports server-side pagination, search, condition, doctorId, date range)
      if ((url.endsWith('/patients') || url.includes('/patients?')) && method === 'get') {
        const allPatients = getAllStoredPatients();
        const allDoctors = getAllStoredDoctors();

        const conditions = Array.from(
          new Set(allPatients.map((p) => p.condition))
        ).sort();
        const doctorsList = allDoctors.map((d) => ({ id: d.id, name: d.name }));

        const params = config.params || {};
        const hasPaginationParams =
          params.page !== undefined ||
          params.limit !== undefined ||
          params.search !== undefined ||
          params.condition !== undefined ||
          params.doctorId !== undefined ||
          params.from !== undefined ||
          params.to !== undefined;

        if (!hasPaginationParams) {
          return createAxiosResponse(allPatients, 200, config);
        }

        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.max(1, Number(params.limit) || 5);
        const search = String(params.search || '').trim().toLowerCase();
        const condition = String(params.condition || '');
        const doctorId = String(params.doctorId || '');
        const from = String(params.from || '');
        const to = String(params.to || '');

        const filtered = allPatients.filter((pat) => {
          if (condition && condition !== 'ALL' && pat.condition !== condition) {
            return false;
          }
          if (doctorId && doctorId !== 'ALL') {
            const matchesId =
              pat.doctorId === doctorId || pat.assignedDoctorId === doctorId;
            const matchesName =
              pat.doctorName?.toLowerCase() === doctorId.toLowerCase() ||
              pat.assignedDoctorName.toLowerCase() === doctorId.toLowerCase();
            if (!matchesId && !matchesName) {
              return false;
            }
          }
          const createdDateOnly = (pat.createdAt || pat.lastVisitDate).slice(0, 10);
          if (from && createdDateOnly < from) {
            return false;
          }
          if (to && createdDateOnly > to) {
            return false;
          }
          if (!search) return true;
          return (
            pat.name.toLowerCase().includes(search) ||
            pat.condition.toLowerCase().includes(search) ||
            pat.assignedDoctorName.toLowerCase().includes(search) ||
            pat.phone.toLowerCase().includes(search) ||
            pat.mrn.toLowerCase().includes(search)
          );
        });

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * limit;

        const payload: PaginatedPatientsResponse = {
          data: filtered.slice(start, start + limit),
          total,
          page: safePage,
          limit,
          totalPages,
          conditions,
          doctors: doctorsList,
        };

        return createAxiosResponse(payload, 200, config);
      }

      // PATCH or PUT /patients/:id
      const patientDetailMatch = url.match(/\/patients\/([^/?#]+)$/);
      if (patientDetailMatch && (method === 'patch' || method === 'put')) {
        const patientId = decodeURIComponent(patientDetailMatch[1]);
        const rawBody =
          typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
        const allDoctors = getAllStoredDoctors();
        const allPatients = getAllStoredPatients();
        const existing = allPatients.find((p) => p.id === patientId);

        const resolvedDoctor = rawBody.doctorId
          ? allDoctors.find((d) => d.id === rawBody.doctorId)
          : undefined;

        const patchData: Partial<Patient> = {
          ...(rawBody.name !== undefined
            ? { name: String(rawBody.name).trim(), fullName: String(rawBody.name).trim() }
            : {}),
          ...(rawBody.age !== undefined ? { age: Number(rawBody.age) } : {}),
          ...(rawBody.gender !== undefined ? { gender: String(rawBody.gender) } : {}),
          ...(rawBody.phone !== undefined ? { phone: String(rawBody.phone).trim() } : {}),
          ...(rawBody.condition !== undefined
            ? {
                condition: String(rawBody.condition).trim(),
                primaryDiagnosis: String(rawBody.condition).trim(),
              }
            : {}),
          ...(rawBody.doctorId !== undefined
            ? {
                doctorId: String(rawBody.doctorId),
                assignedDoctorId: String(rawBody.doctorId),
                doctorName:
                  rawBody.doctorName ||
                  resolvedDoctor?.name ||
                  existing?.doctorName ||
                  'Dr. Elena Rostova',
                assignedDoctorName:
                  rawBody.doctorName ||
                  resolvedDoctor?.name ||
                  existing?.assignedDoctorName ||
                  'Dr. Elena Rostova',
                department:
                  rawBody.department ||
                  resolvedDoctor?.specialization ||
                  existing?.department ||
                  'Cardiology',
              }
            : {}),
        };

        if (typeof window !== 'undefined') {
          const updatedRaw = localStorage.getItem('dt_updated_patients');
          const updatedMap: Record<string, Partial<Patient>> = updatedRaw
            ? JSON.parse(updatedRaw)
            : {};
          updatedMap[patientId] = {
            ...(updatedMap[patientId] || {}),
            ...patchData,
          };
          localStorage.setItem('dt_updated_patients', JSON.stringify(updatedMap));
        }

        const updatedRecord: Patient = {
          ...(existing || FALLBACK_PATIENTS[0]),
          ...patchData,
          id: patientId,
        };

        return createAxiosResponse(updatedRecord, 200, config);
      }

      const nestedDoctorPatientDeleteMatch = url.match(
        /\/doctors\/([^/?#]+)\/patients\/([^/?#]+)$/
      );
      if (
        (patientDetailMatch || nestedDoctorPatientDeleteMatch) &&
        method === 'delete'
      ) {
        const patientId = decodeURIComponent(
          nestedDoctorPatientDeleteMatch
            ? nestedDoctorPatientDeleteMatch[2]
            : patientDetailMatch![1]
        );
        if (typeof window !== 'undefined') {
          const deletedRaw = localStorage.getItem('dt_deleted_patients');
          const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
          if (!deletedIds.includes(patientId)) {
            localStorage.setItem(
              'dt_deleted_patients',
              JSON.stringify([...deletedIds, patientId])
            );
          }
        }
        return createAxiosResponse({ deleted: true, id: patientId }, 200, config);
      }

      if (url.endsWith('/patients') && method === 'post') {
        const rawBody =
          typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
        const allDoctors = getAllStoredDoctors();
        const doctorId = String(rawBody.doctorId || rawBody.assignedDoctorId || 'doc-101');
        const resolvedDoc = allDoctors.find((d) => d.id === doctorId);
        const patientName = String(rawBody.name || rawBody.fullName || 'New Patient').trim();
        const patientCondition = String(
          rawBody.condition || rawBody.primaryDiagnosis || 'Initial Clinical Evaluation'
        ).trim();
        const nowIso = new Date().toISOString();

        const newPatient: Patient = buildPatientRecord({
          id: `pat-${Date.now()}`,
          mrn: rawBody.mrn || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
          name: patientName,
          age: Number(rawBody.age) || 46,
          gender: String(rawBody.gender || 'Female'),
          phone: String(rawBody.phone || '+1 (415) 509-0000').trim(),
          condition: patientCondition,
          doctorId,
          assignedDoctorName:
            rawBody.doctorName ||
            rawBody.assignedDoctorName ||
            resolvedDoc?.name ||
            'Dr. Elena Rostova',
          department:
            rawBody.department || resolvedDoc?.specialization || 'Cardiology',
          acuity: rawBody.acuity || 'STABLE',
          lastVisitDate: nowIso,
          roomNumber: rawBody.roomNumber || 'Outpatient-1',
        });

        if (typeof window !== 'undefined') {
          const customRaw = localStorage.getItem('dt_custom_patients');
          const customPatients: Patient[] = customRaw ? JSON.parse(customRaw) : [];
          localStorage.setItem(
            'dt_custom_patients',
            JSON.stringify([newPatient, ...customPatients])
          );
        }
        return createAxiosResponse(newPatient, 201, config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
