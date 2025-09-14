import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { User, LoginCredentials, RegisterData, AuthResponse, ApiError } from '../types/user';

// Use the proxy setup from vite.config.ts
const API_BASE_URL = '/api'; // This will be proxied to http://127.0.0.1:8000

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - check if backend is running');
      return Promise.reject(new Error('Network error. Please check if the server is running.'));
    }
    
    return Promise.reject(error);
  }
);

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    console.log('Attempting login with:', credentials.email);
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/login', credentials);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.response?.data) {
      // Handle Laravel validation errors
      const errorData: ApiError = error.response.data;
      if (errorData.errors) {
        // Extract first validation error
        const firstError = Object.values(errorData.errors)[0];
        if (Array.isArray(firstError)) {
          throw new Error(firstError[0]);
        }
        throw new Error(firstError as string);
      } else if (errorData.message) {
        throw new Error(errorData.message);
      }
    }
    
    // Handle network errors
    if (error.message.includes('Network error')) {
      throw error;
    }
    
    throw new Error('Login failed. Please check your credentials.');
  }
};

export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  try {
    console.log('Attempting registration with:', userData);
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/register', userData);
    console.log('Registration successful:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.response?.data) {
      const errorData: ApiError = error.response.data;
      if (errorData.errors) {
        // Return Laravel validation errors as object
        throw new Error(JSON.stringify(errorData.errors));
      } else if (errorData.message) {
        throw new Error(errorData.message);
      }
    }
    
    // Handle network errors
    if (error.message.includes('Network error')) {
      throw error;
    }
    
    throw new Error('Registration failed. Please try again.');
  }
};

export const fetchUser = async (): Promise<User> => {
  try {
    console.log('Fetching user data...');
    const response: AxiosResponse<any> = await apiClient.get('/auth/user');
    
    console.log('Raw API response:', response.data);
    
    // Handle different response structures
    let userData: User;
    
    if (response.data.data) {
      // If the response is wrapped in a 'data' property
      userData = response.data.data;
      console.log('User data extracted from data property:', userData);
    } else if (response.data.user) {
      // If the response is wrapped in a 'user' property
      userData = response.data.user;
      console.log('User data extracted from user property:', userData);
    } else {
      // If the response is the user data directly
      userData = response.data;
      console.log('User data used directly:', userData);
    }
    
    // Validate that we have the required user data
    if (!userData || !userData.role) {
      console.error('Invalid user data structure:', userData);
      throw new Error('Invalid user data received from server');
    }
    
    console.log('Final user data with role:', userData.role);
    return userData;
    
  } catch (error) {
    console.error('Fetch user error:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('token');
  }
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

export const updateProfile = async (profileData: Partial<User>): Promise<User> => {
  try {
    const response: AxiosResponse<User> = await apiClient.put('/auth/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

export default apiClient;