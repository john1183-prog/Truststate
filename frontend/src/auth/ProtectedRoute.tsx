import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { RoleEnum } from '../types';
import { AuthLoadingScreen } from '../components/AuthLoadingScreen';

interface ProtectedRouteProps {
  allowedRoles?: RoleEnum[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // While startup session restoration is in flight, do NOT make an authorization decision.
  // Render loading placeholder so protected dashboard components never mount prematurely.
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // If session restoration finished and user is not authenticated, redirect to login
  // while preserving the attempted location in navigation state.
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route restricts roles and current user role is not permitted, redirect to unauthorized.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and authorized: render the matched child route.
  return <Outlet />;
};
