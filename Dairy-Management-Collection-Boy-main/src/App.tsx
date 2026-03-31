import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Loader from "./components/loader";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

const MainLayout = lazy(() => import("./layout/mainLayout"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));

const DashboardPage = lazy(() => import("./pages/dashboard/dashboard"));
const FarmerListPage = lazy(() => import("./pages/farmers/farmerList"));
const AddFarmerPage = lazy(() => import("./pages/farmers/addFarmer"));
const MilkEntryPage = lazy(() => import("./pages/milkCollection/milkEntry"));
const DeductionListPage = lazy(() => import("./pages/deduction/deductionList"));
const AddDeductionPage = lazy(() => import("./pages/deduction/addDeduction"));
const InventoryListPage = lazy(
  () => import("./modules/inventory/pages/InventoryListPage"),
);
const AddInventoryPage = lazy(
  () => import("./modules/inventory/pages/AddInventoryPage"),
);
const BonusManagementPage = lazy(() => import("./pages/bonus/bonusManagement"));
const RateChartPage = lazy(() => import("./pages/rateChart/rateChart"));
const DailyReportPage = lazy(() => import("./pages/reports/dailyReport"));
const MonthlyReportPage = lazy(() => import("./pages/reports/monthlyReport"));
const BillManagementPage = lazy(
  () => import("./modules/billing/pages/BillManagementPage"),
);
const MilkYieldReportPage = lazy(
  () => import("./pages/reports/milkYieldReport"),
);
const BillingReportPage = lazy(() => import("./pages/reports/billingReport"));
const InventoryReportPage = lazy(
  () => import("./pages/reports/inventoryReport"),
);
const FarmerPaymentReportPage = lazy(
  () => import("./pages/reports/farmerPaymentReport"),
);
const MilkQualityReportPage = lazy(
  () => import("./pages/reports/milkQualityReport"),
);
const AuditTrailReportPage = lazy(
  () => import("./pages/reports/auditTrailReport"),
);
const SettingsPage = lazy(
  () => import("./modules/settings/pages/SettingsPage"),
);
const CentresPage = lazy(() => import("./pages/centres/centresPage"));
const AdminsPage = lazy(() => import("./pages/admins/adminsPage"));
const PaymentsPage = lazy(
  () => import("./modules/payments/pages/PaymentsPage"),
);

export const ReportsLayout = () => <Outlet />;

const App: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader size="lg" message="Loading page..." />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route element={<RoleRoute allowedRoles={["superadmin"]} />}>
              <Route path="/centres" element={<CentresPage />} />
              <Route path="/admins" element={<AdminsPage />} />
            </Route>
            <Route path="/farmers" element={<FarmerListPage />} />
            <Route path="/farmers/add" element={<AddFarmerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/milk-collection" element={<MilkEntryPage />} />
            <Route path="/deduction" element={<DeductionListPage />} />
            <Route path="/deduction/add" element={<AddDeductionPage />} />
            <Route path="/inventory" element={<InventoryListPage />} />
            <Route path="/inventory/add" element={<AddInventoryPage />} />
            <Route path="/bonus" element={<BonusManagementPage />} />
            <Route path="/rate-chart" element={<RateChartPage />} />

            <Route path="/reports" element={<ReportsLayout />}>
              <Route index element={<Navigate to="daily" replace />} />
              <Route path="monthly" element={<MonthlyReportPage />} />
              <Route path="daily" element={<DailyReportPage />} />
              <Route path="milk-yield" element={<MilkYieldReportPage />} />
              <Route path="billing" element={<BillingReportPage />} />
              <Route path="farmer-payments" element={<FarmerPaymentReportPage />} />
              <Route path="milk-quality" element={<MilkQualityReportPage />} />
              <Route path="audit-trail" element={<AuditTrailReportPage />} />
              <Route path="inventory" element={<InventoryReportPage />} />
            </Route>

            <Route path="/bills" element={<BillManagementPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <div className="flex h-screen items-center justify-center bg-[#F8F4E3]">
              <div className="rounded-xl border border-[#E9E2C8] bg-white px-8 py-6 text-center shadow">
                <h1 className="mb-2 text-2xl font-bold text-[#5E503F]">
                  404 - Page not found
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
      </Routes>
    </Suspense>
  );
};

export default App;
