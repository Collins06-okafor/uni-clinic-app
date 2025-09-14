import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';
import type { User } from '../types/user';

interface ProtectedRouteProps {
  children: ReactNode;
  user: User | null;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user, requiredRole }) => {
  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // Show loading if user data is not yet loaded
  if (!user) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading user information...</span>
          </div>
          <p className="mt-2">Loading user information...</p>
        </div>
      </div>
    );
  }

  // If a specific role is required, check if user has that role
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to correct role-based dashboard
    switch (user.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'doctor':
        return <Navigate to="/doctor/dashboard" replace />;
      case 'clinical_staff':
        return <Navigate to="/clinical/dashboard" replace />;
      case 'academic_staff':
        return <Navigate to="/academic-staff/dashboard" replace />;
      case 'superadmin':
        return <Navigate to="/superadmin/dashboard" replace />;
      default:
        // For unknown roles, go to default dashboard
        console.warn('Unknown user role:', user.role);
        return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and has correct role - render children
  return <>{children}</>;
};

export default ProtectedRoute;