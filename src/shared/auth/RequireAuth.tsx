import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

interface RequireAuthProps {
  roles?: string[];
}

const RequireAuth: React.FC<RequireAuthProps> = ({ roles }) => {
  const { isAuthenticated, user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
