export type UserRole = 'ADMIN' | 'DOCTOR' | 'COORDINATOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  licenseNumber?: string;
  lastLoginAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type DoctorStatus = 'ON_DUTY' | 'IN_CONSULTATION' | 'OFF_DUTY' | 'ON_CALL';

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: string;
  // Extended clinical telemetry fields (kept in sync for profile & dashboard views)
  fullName: string;
  specialty: string;
  department: string;
  licenseNumber: string;
  status: DoctorStatus;
  activePatientsCount: number;
  todayAppointmentsCount: number;
  nextAvailableSlot: string;
  joinedDate: string;
}

export interface DoctorsQueryParams {
  page: number;
  limit: number;
  search?: string;
  specialization?: string;
  hospital?: string;
  from?: string;
  to?: string;
}

export interface PaginatedDoctorsResponse {
  data: Doctor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  specializations: string[];
  hospitals: string[];
}

export interface CreateDoctorPayload {
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
}

export type PatientAcuity = 'STABLE' | 'MONITORING' | 'HIGH_PRIORITY';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  condition: string;
  doctorId: string;
  doctorName: string;
  createdAt: string;
  // Extended clinical fields kept in sync across views
  mrn: string;
  fullName: string;
  dateOfBirth: string;
  assignedDoctorId: string;
  assignedDoctorName: string;
  department: string;
  primaryDiagnosis: string;
  acuity: PatientAcuity;
  lastVisitDate: string;
  nextAppointmentDate: string | null;
  roomNumber?: string;
}

export interface CreatePatientPayload {
  name: string;
  age: number;
  gender: string;
  phone: string;
  condition: string;
  doctorId: string;
  doctorName?: string;
  department?: string;
  mrn?: string;
  roomNumber?: string;
  acuity?: PatientAcuity;
}

export interface UpdatePatientPayload {
  name?: string;
  age?: number;
  gender?: string;
  phone?: string;
  condition?: string;
  doctorId?: string;
  doctorName?: string;
  department?: string;
}

export interface DoctorPatientsQueryParams {
  doctorId: string;
  page: number;
  limit: number;
  search?: string;
}

export interface PatientsQueryParams {
  page: number;
  limit: number;
  search?: string;
  condition?: string;
  doctorId?: string;
  from?: string;
  to?: string;
}

export interface PaginatedPatientsResponse {
  data: Patient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  conditions?: string[];
  doctors?: { id: string; name: string }[];
}

export type DashboardRange = 7 | 30 | 90;

export interface PatientsPerDoctorPoint {
  doctorId: string;
  doctorName: string;
  specialization: string;
  count: number;
}

export interface PatientsOverTimePoint {
  date: string;
  count: number;
}

export interface ConditionBreakdownPoint {
  condition: string;
  count: number;
  percentage: number;
}

export interface DoctorsAddedPerWeekPoint {
  week: string;
  count: number;
}

export interface DashboardStats {
  range: DashboardRange;
  totalDoctors: number;
  totalPatients: number;
  newDoctorsThisWeek: number;
  newPatientsThisWeek: number;
  patientsPerDoctor: PatientsPerDoctorPoint[];
  patientsOverTime: PatientsOverTimePoint[];
  conditionBreakdown: ConditionBreakdownPoint[];
  doctorsAddedPerWeek: DoctorsAddedPerWeekPoint[];
}

export interface DailyMetricPoint {
  date: string;
  consultations: number;
  admissions: number;
  discharges: number;
}

export interface DepartmentLoadPoint {
  department: string;
  activeDoctors: number;
  patientLoad: number;
  utilizationRate: number;
}

export interface DashboardSummary {
  totalDoctors: number;
  doctorsOnDuty: number;
  activePatients: number;
  criticalPatients: number;
  appointmentsToday: number;
  completedAppointmentsToday: number;
  avgWaitTimeMinutes: number;
  weeklyTrends: DailyMetricPoint[];
  departmentLoad: DepartmentLoadPoint[];
  recentActivity: {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    patientOrDoctor: string;
    department: string;
  }[];
}
