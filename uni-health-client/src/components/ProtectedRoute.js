import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';

const ProtectedRoute = ({ children, user, requiredRole }) => {
  // Check if the user is logged in
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // If user data is still loading, show a loading spinner
  if (!user) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading user data...</span>
          </div>
          <p className="mt-2">Loading user information...</p>
        </div>
      </div>
    );
  }

  // If a requiredRole is provided and the user doesn't have it, redirect to their dashboard
  if (requiredRole && !user.roles?.includes(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
