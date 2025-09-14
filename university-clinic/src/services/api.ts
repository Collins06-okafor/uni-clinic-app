import axios from 'axios';
import type { AxiosResponse, AxiosRequestConfig, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

class ApiService {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor with localization support
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
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

  // New method for notification-related API calls
  async getNotifications<T = any>(): Promise<T> {
    return this.get('/notifications');
  }

  async markNotificationRead<T = any>(notificationId: string): Promise<T> {
    return this.post(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsRead<T = any>(): Promise<T> {
    return this.post('/notifications/mark-all-read');
  }

  // Real-time data endpoints
  async getDashboardStats<T = any>(): Promise<T> {
    return this.get('/realtime/dashboard-stats');
  }

  async getPatientQueue<T = any>(): Promise<T> {
    return this.get('/realtime/patient-queue');
  }

  // Walk-in patient management
  async getWalkInPatients<T = any>(): Promise<T> {
    return this.get('/clinical/walk-in-patients');
  }

  async registerWalkInPatient<T = any>(patientData: any): Promise<T> {
    return this.post('/clinical/walk-in-patients', patientData);
  }

  async updateWalkInPatientStatus<T = any>(patientId: string, statusData: any): Promise<T> {
    return this.put(`/clinical/walk-in-patients/${patientId}/status`, statusData);
  }

  // Language preference
  async updateLanguagePreference<T = any>(language: string): Promise<T> {
    return this.post('/user/language', { language });
  }

  // Profile image upload
  async uploadAvatar<T = any>(imageFile: File, onProgress?: (progress: UploadProgressEvent) => void): Promise<T> {
    const formData = new FormData();
    formData.append('avatar', imageFile);
    return this.upload('/profile/avatar', formData, onProgress);
  }

  // Appointment scheduling with localization
  async scheduleAppointment<T = any>(appointmentData: any): Promise<T> {
    return this.post('/student/appointments/schedule', appointmentData);
  }

  // Get available doctors with filters
  async getAvailableDoctors<T = any>(params?: {
    date?: string;
    time?: string;
    specialization?: string;
  }): Promise<T> {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.time) queryParams.append('time', params.time);
    if (params?.specialization) queryParams.append('specialization', params.specialization);
    
    const queryString = queryParams.toString();
    return this.get(`/clinical/doctors/availability${queryString ? `?${queryString}` : ''}`);
  }

  // Clinical staff endpoints
  async confirmAppointment<T = any>(appointmentId: string, confirmationData: any): Promise<T> {
    return this.post(`/clinical/appointments/${appointmentId}/confirm`, confirmationData);
  }

  async recordVitalSigns<T = any>(patientId: string, vitalsData: any): Promise<T> {
    return this.post(`/clinical/patients/${patientId}/vitals`, vitalsData);
  }

  async recordMedication<T = any>(patientId: string, medicationData: any): Promise<T> {
    return this.post(`/clinical/patients/${patientId}/medications`, medicationData);
  }

  async getMedicationSchedule<T = any>(date?: string): Promise<T> {
    const queryString = date ? `?date=${date}` : '';
    return this.get(`/clinical/medication-schedule${queryString}`);
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const { data, status } = error.response;
      
      if (data && typeof data === 'object' && 'message' in data) {
        return new Error((data as any).message);
      } else if (data && typeof data === 'object' && 'errors' in data) {
        const errors = (data as any).errors;
        const firstError = Object.values(errors)[0];
        return new Error(Array.isArray(firstError) ? firstError[0] : firstError as string);
      } else if (status === 404) {
        return new Error('Resource not found');
      } else if (status === 403) {
        return new Error('Access denied');
      } else if (status >= 500) {
        return new Error('Server error occurred');
      }
    } else if (error.request) {
      return new Error('Network error - please check your connection');
    }
    
    return new Error(error.message || 'An unexpected error occurred');
  }

  // Get current language setting
  getCurrentLanguage(): string {
    return localStorage.getItem('language') || 'en';
  }

  // Set language for future requests
  setLanguage(language: string): void {
    localStorage.setItem('language', language);
  }

  // Get API base URL
  getBaseURL(): string {
    return API_BASE_URL;
  }

  // Get current auth token
  getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

export default new ApiService();