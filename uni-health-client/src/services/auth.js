import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Request interceptor
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const register = async (data) => {
  try {
    console.log('Sending registration request with data:', data); // Debug log
    const res = await API.post('/auth/register', data);
    console.log('Registration successful:', res.data); // Debug log
    
    // Registration endpoint typically doesn't return a token
    // User needs to login separately after registration
    return res.data;
  } catch (error) {
    console.error('Registration error details:', error.response); // Debug log
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 422 && data.errors) {
        // Laravel validation errors
        throw new Error(JSON.stringify(data.errors));
      } else if (data.message) {
        // General error message from server
        throw new Error(data.message);
      } else {
        // Fallback error message
        throw new Error(`Registration failed with status ${status}`);
      }
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      throw new Error('Registration failed: ' + error.message);
    }
  }
};

export const login = async (data) => {
  try {
    console.log('Sending login request'); // Debug log
    const res = await API.post('/auth/login', data);
    console.log('Login successful:', res.data); // Debug log
    
    // ✅ FIX: Automatically store token after successful login
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      console.log('Token stored in localStorage:', res.data.token); // Debug log
    }
    
    return res.data;
  } catch (error) {
    console.error('Login error details:', error.response); // Debug log
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 422 && data.errors) {
        // Laravel validation errors
        throw new Error(JSON.stringify(data.errors));
      } else if (data.message) {
        throw new Error(data.message);
      } else {
        throw new Error(`Login failed with status ${status}`);
      }
    } else if (error.request) {
      throw new Error('No response from server. Please check your connection.');
    } else {
      throw new Error('Login failed: ' + error.message);
    }
  }
};

export const logout = async () => {
  try {
    await API.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
  }
};

export const fetchUser = async () => {
  try {
    const res = await API.get('/user');
    return res.data;
  } catch (error) {
    localStorage.removeItem('token');
    throw error;
  }
};

export const getToken = () => localStorage.getItem('token');
export const isAuthenticated = () => !!getToken();