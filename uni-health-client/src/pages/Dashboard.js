// src/pages/Dashboard.js
import { useEffect, useState } from 'react';
import { fetchUser } from '../services/auth';
import AdminDashboard from './dashboards/AdminDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import StudentDashboard from './dashboards/StudentDashboard';
import ClinicalStaffDashboard from './dashboards/ClinicalStaffDashboard';
import AcademicStaffDashboard from './dashboards/AcademicStaffDashboard';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard'; // Correct import

// Logout function
const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

// Default fallback dashboard
const DefaultDashboard = ({ user, onLogout }) => (
  <>
    <h2>Welcome to the Dashboard</h2>
    <p>Hello, {user.name} ({user.email})</p>
    <p className="text-muted">Role: {user.role}</p>
    <div className="alert alert-warning">
      Your role doesn't have a specific dashboard yet.
    </div>
    <button className="btn btn-danger mt-3" onClick={onLogout}>
      Logout
    </button>
  </>
);

const Dashboard = ({ user: propUser }) => {
  const [user, setUser] = useState(propUser || null);
  const [loading, setLoading] = useState(!propUser);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUser();
        const resolvedUser = userData.user || userData;
        setUser(resolvedUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    if (propUser && propUser.name && propUser.role) {
      setUser(propUser);
      setLoading(false);
    } else {
      loadUser();
    }
  }, [propUser]);

  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case 'admin':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'doctor':
        return <DoctorDashboard user={user} onLogout={handleLogout} />;
      case 'student':
        return <StudentDashboard user={user} onLogout={handleLogout} />;
      case 'clinical_staff':
        return <ClinicalStaffDashboard user={user} onLogout={handleLogout} />;
      case 'academic_staff':
        return <AcademicStaffDashboard user={user} onLogout={handleLogout} />;
      case 'superadmin':
        return <SuperAdminDashboard user={user} onLogout={handleLogout} />; // ✅ FIXED: passing props
      default:
        return <DefaultDashboard user={user} onLogout={handleLogout} />;
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading user info...</span>
          </div>
          <p className="mt-2">Loading user info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;
