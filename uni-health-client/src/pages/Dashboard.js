// src/pages/Dashboard.js
import { useEffect, useState } from 'react';
import { fetchUser } from '../services/auth';
import AdminDashboard from './dashboards/AdminDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import StudentDashboard from './dashboards/StudentDashboard';
import ClinicalStaffDashboard from './dashboards/ClinicalStaffDashboard';
import AcademicStaffDashboard from './dashboards/AcademicStaffDashboard';

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/';
};

// Add a simple default dashboard component
const DefaultDashboard = ({ user, onLogout }) => {
  return (
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
};

const Dashboard = ({ user: propUser }) => {
  const [user, setUser] = useState(propUser || null);
  const [loading, setLoading] = useState(!propUser);

  useEffect(() => {
    console.log('Dashboard useEffect - propUser:', propUser); // Debug log
    
    // Always fetch user data to ensure we have the latest info
    const loadUser = async () => {
      try {
        const userData = await fetchUser();
        console.log('Dashboard - fetched user data:', userData); // Debug log
        
        // Handle both response formats: { user: {...} } or direct user object
        const user = userData.user || userData;
        console.log('Dashboard - processed user:', user); // Debug log
        setUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        // Redirect to login on error
        handleLogout();
      } finally {
        setLoading(false);
      }
    };
    
    if (propUser && propUser.name && propUser.role) {
      // If we have valid prop user data, use it
      console.log('Using prop user data:', propUser);
      setUser(propUser);
      setLoading(false);
    } else {
      // Otherwise fetch user data
      console.log('Fetching user data...');
      loadUser();
    }
  }, [propUser]);

  const renderDashboard = () => {
    console.log('Rendering dashboard with user:', user); // Debug log
    
    if (!user) {
      console.log('No user data available');
      return null;
    }
    
    if (!user.role) {
      console.log('User has no role:', user);
      return <DefaultDashboard user={user} onLogout={handleLogout} />;
    }
    
    console.log('User role:', user.role); // Debug log
    
    switch(user.role) {
      case 'admin':
        console.log('Rendering AdminDashboard');
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'doctor':
        console.log('Rendering DoctorDashboard');
        return <DoctorDashboard user={user} onLogout={handleLogout} />;
      case 'student':
        console.log('Rendering StudentDashboard');
        return <StudentDashboard user={user} onLogout={handleLogout} />;
      case 'clinical_staff':
        console.log('Rendering ClinicalStaffDashboard');
        return <ClinicalStaffDashboard user={user} onLogout={handleLogout} />;
      case 'academic_staff':
        console.log('Rendering AcademicStaffDashboard');
        return <AcademicStaffDashboard user={user} onLogout={handleLogout} />;
      default:
        console.log('Unknown role, rendering DefaultDashboard:', user.role);
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