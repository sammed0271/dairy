import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "../layout/superadmin/mainLayout";
import SettingsPage from "../pages/superadmin/settings/settings";
import FallBackPage from "../pages/fallback";
import AddUserPage from "../pages/superadmin/settings/adduser";
import SuperadminRateChart from "../pages/superadmin/Ratechart/ratechart";


const DashboardPage = lazy(() => import("../pages/superadmin/dashboard/dashboard"));
const CentersPage = lazy(() => import("../pages/superadmin/center/center"));
const CenterDetails = lazy(() => import("../pages/superadmin/center/centerDetails"));
const AddCenterPage = lazy(() => import("../pages/superadmin/center/addCenter"));
import SuperadminReports from "../pages/superadmin/reports/superadminReports";
import SuperadminQuality from "../pages/superadmin/quality/quality";


export default function SuperadminRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/centers" element={<CentersPage />} />
        <Route path="/centers/new" element={<AddCenterPage />} />
        <Route path="/centers/:id" element={<CenterDetails />} />
        <Route path="/rate-chart" element={<SuperadminRateChart />} />
        <Route path="/quality" element={<SuperadminQuality />} />

        <Route path="/reports" element={<SuperadminReports />} />

        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/users/new" element={<AddUserPage />} />
      </Route>
      {/* 404 */}
      <Route
        path="*"
        element={<FallBackPage />}
      />
    </Routes>

  );
}