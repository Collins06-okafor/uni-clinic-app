export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'doctor' | 'admin' | 'clinical_staff' | 'academic_staff' | 'superadmin';
  status?: string;
  created_at?: string;
  updated_at?: string;
  
  // Student specific fields
  student_id?: string;
  department?: string;
  
  // Doctor specific fields
  medical_license_number?: string;
  specialization?: string;
  
  // Staff specific fields
  staff_no?: string;
  faculty?: string;
  
  // Profile fields
  phone?: string;
  date_of_birth?: string;
  profile_image?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
  allergies?: string;
  has_known_allergies?: boolean;
  allergies_uncertain?: boolean;
  addictions?: string;
  phone_number?: string;
  
  // Authorization
  roles?: string[];
  permissions?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: string;
  phone?: string;
  
  // Role-specific fields
  student_id?: string;
  department?: string;
  medical_license_number?: string;
  specialization?: string;
  staff_no?: string;
  faculty?: string;
}

export interface AuthResponse {
  token?: string;
  user?: User;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}