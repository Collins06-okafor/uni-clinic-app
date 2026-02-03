import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DoctorDashboard from './pages/dashboards/DoctorDashboard';
import ClinicalStaffDashboard from './pages/dashboards/ClinicalStaffDashboard';
import AcademicStaffDashboard from './pages/dashboards/AcademicStaffDashboard';
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { fetchUser } from './services/auth';
import type { User } from './types/user';
import './transitions.css';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';

// Define the common props interface for all dashboard components
interface DashboardProps {
  user: User | null;
  onLogout?: () => void;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/', { replace: true });
  }, [navigate]);

  const refreshUser = async () => {
    try {
      const userData = await fetchUser();
      console.log('User data fetched:', userData);
      setUser(userData);
      console.log('User state updated with role:', userData?.role);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      localStorage.removeItem('token');
      if (location.pathname !== '/' && location.pathname !== '/register') {
        navigate('/', { replace: true });
      }
    }
  };

  // Navigate user to their role-specific dashboard - now memoized
  const navigateToRoleDashboard = useCallback((userRole: string) => {
    console.log('Navigating user with role:', userRole, 'to dashboard');
    switch (userRole) {
      case 'student':
        console.log('Redirecting to student dashboard');
        navigate('/student/dashboard', { replace: true });
        break;
      case 'admin':
        console.log('Redirecting to admin dashboard');
        navigate('/admin/dashboard', { replace: true });
        break;
      case 'doctor':
        console.log('Redirecting to doctor dashboard');
        navigate('/doctor/dashboard', { replace: true });
        break;
      case 'clinical_staff':
        console.log('Redirecting to clinical staff dashboard');
        navigate('/clinical/dashboard', { replace: true });
        break;
      case 'academic_staff':
        console.log('Redirecting to academic staff dashboard');
        navigate('/academic-staff/dashboard', { replace: true });
        break;
      case 'superadmin':
        console.log('Redirecting to superadmin dashboard');
        navigate('/superadmin/dashboard', { replace: true });
        break;
      default:
        console.log('Unknown role, redirecting to default dashboard:', userRole);
        navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await refreshUser();
      }
      setLoading(false);
    };
    initializeUser();
  }, []); // This is correct - no dependencies needed for initialization

  const handleLoginSuccess = async () => {
    await refreshUser();
    // Don't navigate here - let the useEffect handle it after user is set
  };

  const handleRegistrationSuccess = async () => {
    await refreshUser();
    // Don't navigate here - let the useEffect handle it after user is set
  };

  // Navigate to role dashboard when user is loaded - now with correct dependencies
  useEffect(() => {
    if (user && (location.pathname === '/' || location.pathname === '/register' || location.pathname === '/dashboard')) {
      navigateToRoleDashboard(user.role);
    }
  }, [user, location.pathname, navigateToRoleDashboard]);

  // Handle page transitions
  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Helper function to get redirect path for authenticated users
  const getRedirectPath = (userRole: string): string => {
    switch (userRole) {
      case 'academic_staff':
        return '/academic-staff/dashboard';
      case 'clinical_staff':
        return '/clinical/dashboard';
      default:
        return `/${userRole}/dashboard`;
    }
  };

  return (
    <div className="app-container">
      <div className={`page-container ${transitioning ? 'transitioning' : ''}`}>
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                // Redirect authenticated users to their role-specific dashboard
                <Navigate 
                  to={getRedirectPath(user.role)} 
                  replace 
                />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )
            } 
          />
          <Route 
            path="/register" 
            element={<RegisterPage onRegistrationSuccess={handleRegistrationSuccess} />} 
          />
          
          {/* Default dashboard - only for unknown roles */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          
          {/* Role-specific dashboard routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="student">
                <StudentDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="admin">
                <AdminDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="doctor">
                <DoctorDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clinical/dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="clinical_staff">
                <ClinicalStaffDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academic-staff/dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="academic_staff">
                <AcademicStaffDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/dashboard"
            element={
              <ProtectedRoute user={user} requiredRole="superadmin">
                <SuperAdminDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;