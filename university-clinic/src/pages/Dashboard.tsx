import { useEffect, useState } from 'react';
import { fetchUser } from '../services/auth';
import type { User } from '../types/user';

interface DashboardProps {
  user: User | null; // Allow null
  onLogout: () => void;
}

// Logout function
const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

// Default fallback dashboard - ONLY for unknown roles
const DefaultDashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <div className="container mt-5">
    <div className="card">
      <div className="card-body">
        <h2 className="card-title">Welcome to the Dashboard</h2>
        <p className="card-text">Hello, {user.name} ({user.email})</p>
        <p className="text-muted">Role: {user.role}</p>
        <div className="alert alert-warning">
          <strong>Notice:</strong> Your role "{user.role}" doesn't have a specific dashboard configured yet.
          Please contact your administrator for assistance.
        </div>
        <button className="btn btn-danger mt-3" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user: propUser }) => {
  const [user, setUser] = useState<User | null>(propUser || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only load user if not provided as prop and we don't have user data
    if (!propUser && !user) {
      const loadUser = async () => {
        setLoading(true);
        try {
          const userData = await fetchUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          handleLogout();
        } finally {
          setLoading(false);
        }
      };
      loadUser();
    } else if (propUser) {
      setUser(propUser);
    }
  }, [propUser, user]);

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading user info...</span>
          </div>
          <p className="mt-2">Loading user information...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <strong>Error:</strong> Unable to load user information. Please try logging in again.
          <button className="btn btn-link p-0 ms-2" onClick={handleLogout}>
            Login
          </button>
        </div>
      </div>
    );
  }

  // This dashboard should ONLY be used for unknown/unsupported roles
  // All known roles should have their own specific dashboard routes and should never reach here
  const knownRoles = ['admin', 'doctor', 'student', 'clinical_staff', 'academic_staff', 'superadmin'];
  
  if (knownRoles.includes(user.role)) {
    // If a known role reached here, it's a routing error - redirect them properly
    const correctPath = user.role === 'academic_staff' ? '/academic-staff/dashboard' : 
                       user.role === 'clinical_staff' ? '/clinical/dashboard' : 
                       `/${user.role}/dashboard`;
    
    // Use useEffect to handle the redirect
    useEffect(() => {
      const timer = setTimeout(() => {
        window.location.href = correctPath;
      }, 1000);
      
      return () => clearTimeout(timer);
    }, [correctPath]);
    
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">
          <strong>Redirecting...</strong> Taking you to your dashboard.
        </div>
        <DefaultDashboard user={user} onLogout={handleLogout} />
      </div>
    );
  }

  // Show default dashboard for unknown roles
  return <DefaultDashboard user={user} onLogout={handleLogout} />;
};

export default Dashboard;