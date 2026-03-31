import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { AuthRole } from "../types/auth";
import { getStoredUser } from "../utils/auth";

interface RoleRouteProps {
  allowedRoles: AuthRole[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
