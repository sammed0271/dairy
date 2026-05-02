import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";


import ProtectedRoute from "../routes/ProtectedRoute";
import RoleRoute from "./RoleRoute";

// Pages
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const FallBackPage = lazy(() => import("../pages/fallback"))
import AdminRoutes from "./AdminRoutes";
import SuperadminRoutes from "./SuperadminRoutes";


export default function AppRoutes() {
  const { user } = useAppContext();
  return (

    <Routes>
      {/* Redirect root → dashboard */}
      <Route path="/" element={user?.role === "admin" ? <Navigate to="/dashboard" replace /> : <Navigate to="/sa/dashboard" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>

        {/* ADMIN */}
        <Route element={<RoleRoute role="admin" />}>
          <Route path="/*" element={<AdminRoutes />} />
        </Route>

        {/* SUPERADMIN */}
        <Route element={<RoleRoute role="superadmin" />}>
          <Route path="/sa/*" element={<SuperadminRoutes />} />
        </Route>


        {/* 404 */}
        <Route
          path="*"
          element={<FallBackPage />}
        />
      </Route>
    </Routes >
  );
}