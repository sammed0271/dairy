import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";


import ProtectedRoute from "../routes/ProtectedRoute";
import RoleRoute from "./RoleRoute";




// Pages
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));

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
          element={
            <div className="flex h-screen items-center justify-center bg-[#F8F4E3]">
              <div className="rounded-xl border border-[#E9E2C8] bg-white px-8 py-6 text-center shadow">
                <h1 className="mb-2 text-2xl font-bold text-[#5E503F]">
                  404 – Page not found
                </h1>
                <p className="mb-4 text-sm text-[#5E503F]/70">
                  The page you are looking for doesn&apos;t exist.
                </p>
                <a
                  href="/dashboard"
                  className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#247B71]"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          }
        />
      </Route>
    </Routes >
  );
}