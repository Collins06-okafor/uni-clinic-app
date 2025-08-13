// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/auth';

const ProtectedRoute = ({ children, user }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // If user data is still loading, show loading state
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

  return children;
};

export default ProtectedRoute;