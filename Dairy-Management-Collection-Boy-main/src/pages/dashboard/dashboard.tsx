// src/pages/dashboard/dashboard.tsx
import React, { useEffect, useState } from "react";
import {
  getTodayDashboardStats,
  getTopFarmers,
  getMonthlyDashboardStats,
} from "../../axios/dashboard_api";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/statCard";
import toast from "react-hot-toast";

type ShiftStats = {
  totalLiters: number;
  cow: number;
  buffalo: number;
  mix: number;
  amount: number;
};

type TodayStats = {
  morning: ShiftStats;
  evening: ShiftStats;
  farmersToday: number;
  totalLiters: number;
  amountToday: number;
};

type MonthStats = {
  totalLiters: number | null;
  amount: number | null;
  cowPercent: number | null;
  buffaloPercent: number | null;
  mixPercent: number | null;
};

// type TopFarmer = {
//   code: string;
//   name: string;
//   liters: number | null;
//   amount: number | null;
// };

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const emptyShift = {
    totalLiters: 0,
    cow: 0,
    buffalo: 0,
    mix: 0,
    amount: 0,
  };

  const [todayStats, setTodayStats] = useState<TodayStats>({
    morning: emptyShift,
    evening: emptyShift,
    farmersToday: 0,
    totalLiters: 0,
    amountToday: 0,
  });

  const [monthStats, setMonthStats] = useState<MonthStats>({
    totalLiters: 0,
    amount: 0,
    cowPercent: 0,
    buffaloPercent: 0,
    mixPercent: 0,
  });

  // const [setTopFarmers] = useState<TopFarmer[]>([]);

  const quickActions = [
    {
      label: "New Milk Entry",
      description: "Record today’s milk collection",
      onClick: () => navigate("/milk-collection"),
    },
    {
      label: "Add Farmer",
      description: "Register a new farmer",
      onClick: () => navigate("/farmers/add"),
    },
    {
      label: "Generate Bills",
      description: "Create farmer payment bills",
      onClick: () => navigate("/bills"),
    },
    {
      label: "View Daily Report",
      description: "Today’s collection summary",
      onClick: () => navigate("/reports/daily"),
    },
  ];

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [todayRes, monthRes] = await Promise.all([
          getTodayDashboardStats(),
          getMonthlyDashboardStats(),
          getTopFarmers(),
        ]);

        setTodayStats(todayRes.data || {});
        setMonthStats(monthRes.data || {});
        // setTopFarmers(farmersRes.data ?? []);
      } catch (err) {
        console.error("Dashboard load failed:", err);

        toast.error("Failed to load dashboard data");
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-[#5E503F]">Dashboard</h1>
          <p className="text-sm text-[#5E503F]/70">
            Overview of collections, farmers, payments and inventory.
          </p>
        </header>

        {/* Stat Cards */}
        {/* Stat Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Today's Collection */}
          <StatCard
            title="Today's Collection"
            value={`${todayStats.totalLiters.toLocaleString()} L`}
            subtitle={
              <div className="text-xs space-y-1">
                <div>
                  🌅 Morning: {todayStats.morning.totalLiters.toLocaleString()}{" "}
                  L
                </div>
                <div>
                  🌙 Evening: {todayStats.evening.totalLiters.toLocaleString()}{" "}
                  L
                </div>
                <div>{todayStats.farmersToday} farmers today</div>
              </div>
            }
            variant="teal"
          />

          {/* Today's Amount */}
          <StatCard
            title="Today's Amount"
            value={`₹ ${todayStats.amountToday.toLocaleString()}`}
            subtitle={
              <div className="text-xs space-y-1">
                <div>
                  🌅 Morning: ₹{todayStats.morning.amount.toLocaleString()}
                </div>
                <div>
                  🌙 Evening: ₹{todayStats.evening.amount.toLocaleString()}
                </div>
              </div>
            }
            variant="blue"
          />

          {/* Monthly Collection */}
          <StatCard
            title="Monthly Collection"
            value={`${(monthStats.totalLiters ?? 0).toLocaleString()} L`}
            subtitle={`₹ ${(monthStats.amount ?? 0).toLocaleString()}`}
            variant="orange"
          />

          {/* Milk Type Ratio */}
          <StatCard
            title="Milk Type Ratio"
            value={`${monthStats.cowPercent ?? 0}% Cow / ${
              monthStats.buffaloPercent ?? 0
            }% Buffalo / ${monthStats.mixPercent ?? 0}% Mix`}
            subtitle="Share of monthly liters"
            variant="green"
          />
        </section>

        {/* Breakdown */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Morning */}
          <div className="rounded-xl bg-white p-5">
            <h2 className="text-sm font-semibold text-[#5E503F]">
             🌅 Morning Shift
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg bg-[#F8F4E3] p-4">
                <p className="text-xl font-bold">
                  {todayStats.morning.cow.toLocaleString()} L
                </p>
                <span className="text-2xl">🐄</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#F8F4E3] p-4">
                <p className="text-xl font-bold">
                  {todayStats.morning.buffalo.toLocaleString()} L
                </p>
                <span className="text-2xl">🐃</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#F8F4E3] p-4">
                <p className="text-xl font-bold">
                  {todayStats.morning.mix.toLocaleString()} L
                </p>
                <span className="text-2xl">🥛</span>
              </div>
            </div>

            <p className="mt-4 font-semibold text-[#2A9D8F]">
              Total: {todayStats.morning.totalLiters.toLocaleString()} L
            </p>
          </div>

          {/* Evening */}
          <div className="rounded-xl bg-white p-5">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              🌙 Evening Shift
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg bg-[#F8F4E3] p-4">
                <p className="text-xl font-bold">
                  {todayStats.evening.cow.toLocaleString()} L
                </p>
                <span className="text-2xl">🐄</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#F8F4E3] p-4">
                <p className="text-xl font-bold">
                  {todayStats.evening.buffalo.toLocaleString()} L
                </p>
                <span className="text-2xl">🐃</span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#F8F4E3] p-4">
                <p className="text-xl font-bold">
                  {todayStats.evening.mix.toLocaleString()} L
                </p>
                <span className="text-2xl">🥛</span>
              </div>
            </div>

            <p className="mt-4 font-semibold text-[#2A9D8F]">
              Total: {todayStats.evening.totalLiters.toLocaleString()} L
            </p>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="rounded-xl bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="rounded-lg bg-[#F8F4E3] p-3 text-left"
              >
                <p className="font-semibold text-[#2A9D8F]">{a.label}</p>
                <p className="text-xs">{a.description}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
