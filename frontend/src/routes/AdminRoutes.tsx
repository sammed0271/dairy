import { lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import { FarmerProvider } from "../context/FarmerContext";
const MainLayoutadmin = lazy(() => import("../layout/admin/mainLayout"));

const DashboardPage = lazy(() => import("../pages/admin/dashboard/dashboard"));

const FarmerListPage = lazy(() => import("../pages/admin/farmers/farmerList"));
const AddFarmerPage = lazy(() => import("../pages/admin/farmers/addFarmer"));

const MilkEntryPage = lazy(() => import("../pages/admin/milkCollection/milkEntry"));

const DeductionListPage = lazy(() => import("../pages/admin/deduction/deductionList"));
const AddDeductionPage = lazy(() => import("../pages/admin/deduction/addDeduction"));

const InventoryListPage = lazy(() => import("../pages/admin/inventory/inventoryList"));
const AddInventoryPage = lazy(() => import("../pages/admin/inventory/addInventory"));

const BonusManagementPage = lazy(() => import("../pages/admin/bonus/bonusManagement"));

const RateChartPage = lazy(() => import("../pages/admin/rateChart/rateChart"));

const BillManagementPage = lazy(() => import("../pages/admin/bills/billManagement"));

const DailyReportPage = lazy(() => import("../pages/admin/reports/dailyReport"));
const MonthlyReportPage = lazy(() => import("../pages/admin/reports/monthlyReport"));
const MilkYieldReportPage = lazy(() => import("../pages/admin/reports/milkYieldReport"),);
const BillingReportPage = lazy(() => import("../pages/admin/reports/billingReport"));
const InventoryReportPage = lazy(() => import("../pages/admin/reports/inventoryReport"),);

const Settings = lazy(() => import("../components/Settings"));

import SellDashboard from "../pages/admin/sell/SellDashboard";
import AddSale from "../pages/admin/sell/AddSale";

export const ReportsLayout = () => {
  return <Outlet />;
};
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<FarmerProvider><MainLayoutadmin /></FarmerProvider>}>
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
    </Routes>
  );
}