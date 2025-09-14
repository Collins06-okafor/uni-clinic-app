export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id?: number;
  date: string;
  time: string;
  status: AppointmentStatus;
  reason: string;
  type?: string;
  priority?: 'normal' | 'high' | 'urgent';
  duration?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Related data
  patient?: {
    id: number;
    name: string;
    email: string;
    student_id?: string;
    staff_id?: string;
    department?: string;
  };
  
  doctor?: {
    id: number;
    name: string;
    specialization: string;
    department?: string;
  };
  
  // Additional fields from different contexts
  patient_name?: string;
  doctor_name?: string;
  specialty?: string;
  specialization?: string;
  assigned_doctor?: string;
  student_id?: string;
  doctorImage?: string;
}

export type AppointmentStatus = 
  | 'pending'
  | 'under_review'
  | 'assigned'
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'rescheduled'
  | 'no_show';

export interface AppointmentForm {
  patient_id?: string;
  doctor_id?: string;
  specialization?: string;
  date: string;
  time: string;
  reason: string;
  urgency?: 'normal' | 'high' | 'urgent';
  department?: string;
  appointment_date?: string;
  appointment_time?: string;
  appointment_type?: string;
  priority?: 'normal' | 'high' | 'urgent';
  notes?: string;
}

export interface RescheduleForm {
  id: string;
  date: string;
  time: string;
  appointmentId?: string;
}

export interface Doctor {
  id: number;
  name: string;
  email: string;
  specialization: string;
  specialty?: string;
  department: string;
  phone?: string;
  status?: string;
  full_name?: string;
  availability_status?: string;
}

export interface Patient {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  student_id?: string;
  staff_id?: string;
  age?: number;
  status?: string;
  assigned_doctor?: string;
}