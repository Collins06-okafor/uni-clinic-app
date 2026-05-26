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
import { BrandingProvider } from './contexts/BrandingContext';  // ← ADD

interface DashboardProps {
  user: User | null;
  onLogout?: () => void;
}

function AppRoutes() {
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
      setUser(userData);
    } catch (error) {
      setUser(null);
      localStorage.removeItem('token');
      if (location.pathname !== '/' && location.pathname !== '/register') {
        navigate('/', { replace: true });
      }
    }
  };

  const navigateToRoleDashboard = useCallback((userRole: string) => {
    switch (userRole) {
      case 'student':        navigate('/student/dashboard',        { replace: true }); break;
      case 'admin':          navigate('/admin/dashboard',          { replace: true }); break;
      case 'doctor':         navigate('/doctor/dashboard',         { replace: true }); break;
      case 'clinical_staff': navigate('/clinical/dashboard',       { replace: true }); break;
      case 'academic_staff': navigate('/academic-staff/dashboard', { replace: true }); break;
      case 'superadmin':     navigate('/superadmin/dashboard',     { replace: true }); break;
      default:               navigate('/dashboard',                { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem('token');
      if (token) await refreshUser();
      setLoading(false);
    };
    initializeUser();
  }, []);

  const handleLoginSuccess = async () => { await refreshUser(); };
  const handleRegistrationSuccess = async () => { await refreshUser(); };

  useEffect(() => {
    if (user && (location.pathname === '/' || location.pathname === '/register' || location.pathname === '/dashboard')) {
      navigateToRoleDashboard(user.role);
    }
  }, [user, location.pathname, navigateToRoleDashboard]);

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

  const getRedirectPath = (userRole: string): string => {
    switch (userRole) {
      case 'academic_staff': return '/academic-staff/dashboard';
      case 'clinical_staff': return '/clinical/dashboard';
      default:               return `/${userRole}/dashboard`;
    }
  };

  return (
    <div className="app-container">
      <div className={`page-container ${transitioning ? 'transitioning' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={
              user
                ? <Navigate to={getRedirectPath(user.role)} replace />
                : <LoginPage onLoginSuccess={handleLoginSuccess} />
            }
          />
          <Route path="/register" element={<RegisterPage onRegistrationSuccess={handleRegistrationSuccess} />} />

          <Route path="/dashboard" element={
            <ProtectedRoute user={user}><Dashboard user={user} onLogout={handleLogout} /></ProtectedRoute>
          } />
          <Route path="/student/dashboard" element={
            <ProtectedRoute user={user} requiredRole="student"><StudentDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute user={user} requiredRole="admin"><AdminDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>
          } />
          <Route path="/doctor/dashboard" element={
            <ProtectedRoute user={user} requiredRole="doctor"><DoctorDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>
          } />
          <Route path="/clinical/dashboard" element={
            <ProtectedRoute user={user} requiredRole="clinical_staff"><ClinicalStaffDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>
          } />
          <Route path="/academic-staff/dashboard" element={
            <ProtectedRoute user={user} requiredRole="academic_staff"><AcademicStaffDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>
          } />
          <Route path="/superadmin/dashboard" element={
            <ProtectedRoute user={user} requiredRole="superadmin"><SuperAdminDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>
          } />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ─── Root: BrandingProvider wraps everything ──────────────────────────────────

function App() {
  return (
    <BrandingProvider>
      <AppRoutes />
    </BrandingProvider>
  );
}

export default App;