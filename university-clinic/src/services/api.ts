import axios from 'axios';
import type { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

class ApiService {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Increased to 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor with localization support
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add localization header
        const currentLanguage = localStorage.getItem('language') || 'en';
        config.headers['X-Locale'] = currentLanguage;
        config.headers['Accept-Language'] = currentLanguage;

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor with error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async post<T = any>(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async put<T = any>(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async delete<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  async upload<T = any>(
    url: string, 
    formData: FormData, 
    onUploadProgress?: (progressEvent: UploadProgressEvent) => void
  ): Promise<T> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      if (onUploadProgress) {
        config.onUploadProgress = (progressEvent: any) => {
          const total = progressEvent.total || 0;
          const loaded = progressEvent.loaded || 0;
          const percentage = Math.round((loaded * 100) / total);
          onUploadProgress({ loaded, total, percentage });
        };
      }

      const response: AxiosResponse<T> = await this.client.post(url, formData, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // ==================== CLINIC SETTINGS ====================
  async getClinicSettings<T = any>(): Promise<T> {
    return this.get('/clinical/clinic-settings');
  }

  async saveClinicSettings<T = any>(settingsData: {
    clinic_hours: any[];
    appointment_tips: any[];
    emergency_contacts: any[];
  }): Promise<T> {
    return this.post('/clinical/clinic-settings', settingsData);
  }

  // ==================== APPOINTMENTS ====================
  async getAppointments<T = any>(params?: any): Promise<T> {
    return this.get('/clinical/appointments', { params });
  }

  async getAppointmentById<T = any>(appointmentId: string): Promise<T> {
    return this.get(`/clinical/appointments/${appointmentId}`);
  }

  async createAppointment<T = any>(appointmentData: any): Promise<T> {
    return this.post('/clinical/appointments', appointmentData);
  }

  async updateAppointment<T = any>(appointmentId: string, appointmentData: any): Promise<T> {
    return this.put(`/clinical/appointments/${appointmentId}`, appointmentData);
  }

  async deleteAppointment<T = any>(appointmentId: string): Promise<T> {
    return this.delete(`/clinical/appointments/${appointmentId}`);
  }

  async confirmAppointment<T = any>(appointmentId: string, confirmationData: {
    method: string;
    custom_message?: string;
  }): Promise<T> {
    return this.post(`/clinical/appointments/${appointmentId}/confirm`, confirmationData);
  }

  async assignAppointment<T = any>(appointmentId: string, assignData: {
    doctor_id: string;
    notes?: string;
  }): Promise<T> {
    return this.put(`/clinical/appointments/${appointmentId}/assign`, assignData);
  }

  async rejectAppointment<T = any>(appointmentId: string, rejectData: {
    reason: string;
  }): Promise<T> {
    return this.put(`/clinical/appointments/${appointmentId}/reject`, rejectData);
  }

  async getPendingAppointments<T = any>(): Promise<T> {
    return this.get('/clinical/appointments/pending');
  }

  // ==================== PATIENTS ====================
  async getPatients<T = any>(params?: any): Promise<T> {
    return this.get('/clinical/patients', { params });
  }

  async getPatientById<T = any>(patientId: string): Promise<T> {
    return this.get(`/clinical/patients/${patientId}`);
  }

  async updatePatient<T = any>(patientId: string, patientData: any): Promise<T> {
    return this.put(`/clinical/patients/${patientId}`, patientData);
  }

  async recordVitalSigns<T = any>(patientId: string, vitalsData: any): Promise<T> {
    return this.post(`/clinical/patients/${patientId}/vitals`, vitalsData);
  }

  async getVitalSignsHistory<T = any>(patientId: string): Promise<T> {
    return this.get(`/clinical/patients/${patientId}/vital-signs/history`);
  }

  async recordMedication<T = any>(patientId: string, medicationData: any): Promise<T> {
    return this.post(`/clinical/patients/${patientId}/medications`, medicationData);
  }

  async getMedicalCard<T = any>(patientId: string): Promise<T> {
    return this.get(`/clinical/patients/${patientId}/medical-card`);
  }

  async updateMedicalCard<T = any>(patientId: string, cardData: any): Promise<T> {
    return this.post(`/clinical/patients/${patientId}/medical-card`, cardData);
  }

  // ==================== WALK-IN PATIENTS ====================
  async getWalkInPatients<T = any>(): Promise<T> {
    return this.get('/clinical/walk-in-patients');
  }

  async registerWalkInPatient<T = any>(patientData: any): Promise<T> {
    return this.post('/clinical/walk-in-patients', patientData);
  }

  async updateWalkInPatientStatus<T = any>(patientId: string, statusData: any): Promise<T> {
    return this.put(`/clinical/walk-in-patients/${patientId}/status`, statusData);
  }

  // ==================== DOCTORS ====================
  async getAvailableDoctors<T = any>(params?: {
    date?: string;
    time?: string;
    specialization?: string;
  }): Promise<T> {
    return this.get('/clinical/available-doctors', { params });
  }

  async getAllDoctors<T = any>(): Promise<T> {
    return this.get('/clinical/doctors');
  }

  async getDoctorsAvailability<T = any>(): Promise<T> {
    return this.get('/clinical/doctors/availability');
  }

  // ==================== MEDICATIONS ====================
  async getMedications<T = any>(): Promise<T> {
    return this.get('/clinical/medications');
  }

  async addMedication<T = any>(medicationData: any): Promise<T> {
    return this.post('/clinical/medications', medicationData);
  }

  async updateMedication<T = any>(medicationId: string, medicationData: any): Promise<T> {
    return this.put(`/clinical/medications/${medicationId}`, medicationData);
  }

  async deleteMedication<T = any>(medicationId: string): Promise<T> {
    return this.delete(`/clinical/medications/${medicationId}`);
  }

  async getMedicationSchedule<T = any>(date?: string): Promise<T> {
    const params = date ? { date } : undefined;
    return this.get('/clinical/medication-schedule', { params });
  }

  // ==================== CARE TASKS ====================
  async getCareTasks<T = any>(): Promise<T> {
    return this.get('/clinical/care-tasks');
  }

  async createCareTask<T = any>(taskData: any): Promise<T> {
    return this.post('/clinical/care-tasks', taskData);
  }

  // ==================== MEDICAL RECORDS ====================
  async getMedicalRecord<T = any>(recordId: string): Promise<T> {
    return this.get(`/clinical/medical-records/${recordId}`);
  }

  // ==================== URGENT QUEUE ====================
  async getUrgentQueue<T = any>(): Promise<T> {
    return this.get('/clinical/urgent-queue');
  }

  // ==================== STUDENT REQUESTS ====================
  async getStudentRequests<T = any>(): Promise<T> {
    return this.get('/clinical/student-requests');
  }

  async assignStudentRequest<T = any>(requestId: string, assignData: any): Promise<T> {
    return this.post(`/clinical/student-requests/${requestId}/assign`, assignData);
  }

  async approveStudentRequest<T = any>(requestId: string): Promise<T> {
    return this.post(`/clinical/student-requests/${requestId}/approve`);
  }

  async rejectStudentRequest<T = any>(requestId: string, rejectData: any): Promise<T> {
    return this.post(`/clinical/student-requests/${requestId}/reject`, rejectData);
  }

  // ==================== DASHBOARD ====================
  async getDashboard<T = any>(): Promise<T> {
    return this.get('/clinical/dashboard');
  }

  async getDashboardStats<T = any>(): Promise<T> {
    return this.get('/realtime/dashboard-stats');
  }

  async getPatientQueue<T = any>(): Promise<T> {
    return this.get('/realtime/patient-queue');
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications<T = any>(): Promise<T> {
    return this.get('/notifications');
  }

  async markNotificationRead<T = any>(notificationId: string): Promise<T> {
    return this.post(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsRead<T = any>(): Promise<T> {
    return this.post('/notifications/mark-all-read');
  }

  async deleteNotification<T = any>(notificationId: string): Promise<T> {
    return this.delete(`/notifications/${notificationId}`);
  }

  // ==================== PROFILE ====================
  async uploadAvatar<T = any>(imageFile: File, onProgress?: (progress: UploadProgressEvent) => void): Promise<T> {
    const formData = new FormData();
    formData.append('avatar', imageFile);
    return this.upload('/auth/profile/avatar', formData, onProgress);
  }

  async removeAvatar<T = any>(): Promise<T> {
    return this.delete('/auth/profile/avatar');
  }

  // ==================== LANGUAGE ====================
  async updateLanguagePreference<T = any>(language: string): Promise<T> {
    return this.post('/language/set', { language });
  }

  // ==================== ERROR HANDLING ====================
  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      const { data, status } = error.response;
      
      // Check for Laravel validation errors
      if (data && typeof data === 'object' && 'errors' in data) {
        const errors = (data as any).errors;
        const firstError = Object.values(errors)[0];
        return {
          message: Array.isArray(firstError) ? firstError[0] : firstError as string,
          errors: errors,
          status
        };
      }
      
      // Check for standard message
      if (data && typeof data === 'object' && 'message' in data) {
        return {
          message: (data as any).message,
          status
        };
      }
      
      // Status-based errors
      if (status === 404) {
        return { message: 'Resource not found', status };
      } else if (status === 403) {
        return { message: 'Access denied', status };
      } else if (status === 422) {
        return { message: 'Validation failed', status };
      } else if (status >= 500) {
        return { message: 'Server error occurred', status };
      }
    } else if (error.request) {
      return { message: 'Network error - please check your connection', status: 0 };
    }
    
    return { message: error.message || 'An unexpected error occurred' };
  }

  // ==================== UTILITY METHODS ====================
  getCurrentLanguage(): string {
    return localStorage.getItem('language') || 'en';
  }

  setLanguage(language: string): void {
    localStorage.setItem('language', language);
  }

  getBaseURL(): string {
    return API_BASE_URL;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

export default new ApiService();