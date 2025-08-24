// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { fetchUser, isAuthenticated } from './services/auth';
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('App.js - checking authentication...'); // Debug log
      console.log('App.js - isAuthenticated():', isAuthenticated()); // Debug log
      
      if (isAuthenticated()) {
        console.log('App.js - user is authenticated, fetching user data...'); // Debug log
        try {
          const userData = await fetchUser();
          console.log('App.js - user data fetched:', userData); // Debug log
          
          // Check if userData has the expected properties
          if (userData && (userData.user || userData.name)) {
            // Handle both response formats: { user: {...} } or direct user object
            const user = userData.user || userData;
            console.log('App.js - processed user:', user); // Debug log
            setUser(user);
          } else {
            console.error('App.js - invalid user data format:', userData);
            localStorage.removeItem('token');
            setUser(null);
          }
        } catch (error) {
          console.error('App.js - auth check failed:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        console.log('App.js - user is not authenticated'); // Debug log
        setUser(null);
      }
      setAuthChecked(true);
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Function to refresh user data when needed
  const refreshUser = async () => {
    if (isAuthenticated()) {
      try {
        const userData = await fetchUser();
        setUser(userData);
        return userData;
      } catch (error) {
        console.error('User refresh failed:', error);
        localStorage.removeItem('token');
        setUser(null);
        throw error;
      }
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            authChecked && user ? 
            <Navigate to="/dashboard" replace /> : 
            <LoginPage onLoginSuccess={refreshUser} />
          } 
        />
        <Route 
          path="/superadmin" 
          element={
            <ProtectedRoute user={user} requiredRole="superadmin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            authChecked && user ? 
            <Navigate to="/dashboard" replace /> : 
            <RegisterPage onRegisterSuccess={refreshUser} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute user={user}>
              <Dashboard user={user} />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;