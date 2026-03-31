import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser } from "../axios/auth_api";
import Loader from "../components/loader";
import {
  clearSession,
  getStoredUser,
  getToken,
  updateStoredUser,
} from "../utils/auth";

const ProtectedRoute: React.FC = () => {
  const token = getToken();
  const storedUser = getStoredUser();
  const [checking, setChecking] = React.useState(!storedUser && !!token);

  React.useEffect(() => {
    let mounted = true;

    if (!token || storedUser) {
      setChecking(false);
      return () => {
        mounted = false;
      };
    }

    getCurrentUser()
      .then((response) => {
        if (mounted) {
          updateStoredUser(response.data);
        }
      })
      .catch(() => {
        if (mounted) {
          clearSession();
        }
      })
      .finally(() => {
        if (mounted) {
          setChecking(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [storedUser, token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader size="lg" message="Restoring your session..." />
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
