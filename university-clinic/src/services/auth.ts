import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { User, LoginCredentials, RegisterData, AuthResponse, ApiError } from '../types/user';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Add request interceptor
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

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    
    if (error.code === 'ERR_NETWORK') {
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
      const errorData: ApiError = error.response.data;
      if (errorData.errors) {
        const firstError = Object.values(errorData.errors)[0];
        if (Array.isArray(firstError)) {
          throw new Error(firstError[0]);
        }
        throw new Error(firstError as string);
      } else if (errorData.message) {
        throw new Error(errorData.message);
      }
    }
    
    if (error.message.includes('Network error')) {
      throw error;
    }
    
    throw new Error('Login failed. Please check your credentials.');
  }
};

/**
 * Google OAuth Login
 * Sends the Google credential token to backend for verification
 */
export const googleLogin = async (googleToken: string): Promise<AuthResponse> => {
  try {
    console.log('Attempting Google login...');
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/google/token', {
      token: googleToken
    });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Google login error:', error);
    
    if (error.response?.data) {
      const errorData: ApiError = error.response.data;
      if (errorData.message) {
        throw new Error(errorData.message);
      }
    }
    
    throw new Error('Google authentication failed. Please try again.');
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
        throw new Error(JSON.stringify(errorData.errors));
      } else if (errorData.message) {
        throw new Error(errorData.message);
      }
    }
    
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
    
    let userData: User;
    
    if (response.data.data) {
      userData = response.data.data;
    } else if (response.data.user) {
      userData = response.data.user;
    } else {
      userData = response.data;
    }
    
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

export const requestPasswordReset = async (email: string): Promise<void> => {
  try {
    console.log('Requesting password reset for:', email);
    const response: AxiosResponse<{ message: string }> = await apiClient.post('/auth/forgot-password', { email });
    console.log('Password reset request successful:', response.data);
    return;
  } catch (error: any) {
    console.error('Password reset request error:', error);
    
    if (error.response?.data) {
      const errorData: ApiError = error.response.data;
      if (errorData.message) {
        throw new Error(errorData.message);
      }
      if (errorData.errors) {
        const firstError = Object.values(errorData.errors)[0];
        if (Array.isArray(firstError)) {
          throw new Error(firstError[0]);
        }
        throw new Error(firstError as string);
      }
    }
    
    throw new Error('Failed to send password reset email. Please try again.');
  }
};

export const resetPassword = async (token: string, email: string, password: string): Promise<void> => {
  try {
    console.log('Resetting password with token');
    const response: AxiosResponse<{ message: string }> = await apiClient.post('/auth/reset-password', {
      token,
      email,
      password,
      password_confirmation: password,
    });
    console.log('Password reset successful:', response.data);
    return;
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    if (error.response?.data) {
      const errorData: ApiError = error.response.data;
      if (errorData.message) {
        throw new Error(errorData.message);
      }
      if (errorData.errors) {
        const firstError = Object.values(errorData.errors)[0];
        if (Array.isArray(firstError)) {
          throw new Error(firstError[0]);
        }
        throw new Error(firstError as string);
      }
    }
    
    throw new Error('Failed to reset password. The link may have expired.');
  }
};

export default apiClient;