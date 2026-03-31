// src/constants/routes.ts

export interface RoutePathConfig {
  path: string;
  label: string;
}

/**
 * Central place for all main route paths used in the app.
 * Adjust here if you change any path in React Router.
 */
export const ROUTES = {
  dashboard: {
    path: "/dashboard",
    label: "Dashboard",
  },

  centres: {
    list: { path: "/centres", label: "Centres" },
  },

  admins: {
    list: { path: "/admins", label: "Admins" },
  },

  farmers: {
    list: { path: "/farmers", label: "Farmers" },
    add: { path: "/farmers/add", label: "Add Farmer" },
  },

  milkCollection: {
    list: { path: "/milk-collection", label: "Milk Collection" },
    entry: { path: "/milk-collection/entry", label: "Milk Entry" },
  },

  deduction: {
    list: { path: "/deduction", label: "Deductions" },
    add: { path: "/deduction/add", label: "Add Deduction" },
  },

  bills: {
    list: { path: "/bills", label: "Bills" },
  },

  payments: {
    list: { path: "/payments", label: "Payments" },
  },

  bonus: {
    manage: { path: "/bonus", label: "Bonus Management" },
  },

  inventory: {
    list: { path: "/inventory", label: "Inventory" },
    add: { path: "/inventory/add", label: "Add Inventory Item" },
  },

  rateChart: {
    manage: { path: "/rate-chart", label: "Rate Chart" },
  },

  reports: {
    daily: { path: "/reports/daily", label: "Daily Report" },
    monthly: { path: "/reports/monthly", label: "Monthly Report" },
  },

  settings: {
    manage: { path: "/settings", label: "Settings" },
  },
} as const;

// Convenience array for sidebar, if you want to generate it dynamically.
export const SIDEBAR_ITEMS: RoutePathConfig[] = [
  ROUTES.dashboard,
  ROUTES.centres.list,
  ROUTES.admins.list,
  ROUTES.farmers.list,
  ROUTES.milkCollection.list,
  ROUTES.deduction.list,
  ROUTES.bills.list,
  ROUTES.payments.list,
  ROUTES.bonus.manage,
  ROUTES.rateChart.manage,
  ROUTES.inventory.list,
  ROUTES.reports.daily,
  ROUTES.settings.manage,
];
