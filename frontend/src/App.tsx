// src/App.tsx
import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Loader from "./components/loader";
import SellDashboard from "./pages/sell/SellDashboard";
import AddSale from "./pages/sell/AddSale";

import { syncMilkData } from "./utils/syncMilk";

import ProtectedRoute from "./routes/ProtectedRoute";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));

const MainLayout = lazy(() => import("./layout/mainLayout"));

// Pages
const DashboardPage = lazy(() => import("./pages/dashboard/dashboard"));

const FarmerListPage = lazy(() => import("./pages/farmers/farmerList"));
const AddFarmerPage = lazy(() => import("./pages/farmers/addFarmer"));

const MilkEntryPage = lazy(() => import("./pages/milkCollection/milkEntry"));

const DeductionListPage = lazy(() => import("./pages/deduction/deductionList"));
const AddDeductionPage = lazy(() => import("./pages/deduction/addDeduction"));

const InventoryListPage = lazy(() => import("./pages/inventory/inventoryList"));
const AddInventoryPage = lazy(() => import("./pages/inventory/addInventory"));

const BonusManagementPage = lazy(() => import("./pages/bonus/bonusManagement"));
const RateChartPage = lazy(() => import("./pages/rateChart/rateChart"));
const DailyReportPage = lazy(() => import("./pages/reports/dailyReport"));
const MonthlyReportPage = lazy(() => import("./pages/reports/monthlyReport"));
const BillManagementPage = lazy(() => import("./pages/bills/billManagement"));
const MilkYieldReportPage = lazy(
  () => import("./pages/reports/milkYieldReport"),
);
const BillingReportPage = lazy(() => import("./pages/reports/billingReport"));
const InventoryReportPage = lazy(
  () => import("./pages/reports/inventoryReport"),
);
const Settings = lazy(() => import("./components/Settings"));

export const ReportsLayout = () => {
  return <Outlet />;
};

const App: React.FC = () => {
  useEffect(() => {
    const handleOnline = () => {
      console.log("Internet back → syncing...");
      syncMilkData();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader size="lg" message="Loading page..." />
        </div>
      }
    >
      <Routes>
        {/* Redirect root → dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<LoginPage />} />


        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Farmers */}
          <Route path="/farmers" element={<FarmerListPage />} />
          <Route path="/farmers/add" element={<AddFarmerPage />} />

          {/* Sell */}
          <Route path="/sell" element={<SellDashboard />} />
          <Route path="/sell/add" element={<AddSale />} />

          {/*Setting */}
          <Route
            path="/settings"
            element={
              <Settings
                isOpen={false}
                onClose={function (): void {
                  throw new Error("Function not implemented.");
                }}
              />
            }
          />

          {/* Milk Collection (combined entry + list) */}
          <Route path="/milk-collection" element={<MilkEntryPage />} />

          {/* Deductions */}
          <Route path="/deduction" element={<DeductionListPage />} />
          <Route path="/deduction/add" element={<AddDeductionPage />} />

          {/* Inventory */}
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/add" element={<AddInventoryPage />} />

          {/* Bonus */}
          <Route path="/bonus" element={<BonusManagementPage />} />

          {/* Rate Chart */}
          <Route path="/rate-chart" element={<RateChartPage />} />

          {/* Reports */}
          <Route path="/reports" element={<ReportsLayout />}>
            <Route index element={<Navigate to="daily" replace />} />
            <Route path="monthly" element={<MonthlyReportPage />} />

            <Route path="daily" element={<DailyReportPage />} />
            <Route path="milk-yield" element={<MilkYieldReportPage />} />
            <Route path="billing" element={<BillingReportPage />} />
            <Route path="inventory" element={<InventoryReportPage />} />
          </Route>

          {/* Bills */}
          <Route path="/bills" element={<BillManagementPage />} />
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
      </Routes>
    </Suspense>
  );
};

export default App;
