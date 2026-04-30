import { lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import MainLayout from "../layout/superadmin/mainLayout";


const DashboardPage = lazy(() => import("../pages/superadmin/dashboard/dashboard"));
const CentersPage = lazy(() => import("../pages/superadmin/center/center"));


export default function SuperadminRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/centers" element={<CentersPage />} />
      </Route>
    </Routes>

  );
}