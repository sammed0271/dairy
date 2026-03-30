// src/constants/appConfig.ts

export const APP_CONFIG = {
  appName: "My Dairy",
  organizationName: "Gokul Dairy Farm",
  shortName: "My Dairy",
  version: "1.0.0",

  theme: {
    // primary brand colors
    primary: "#2A9D8F",
    primaryDark: "#247B71",

    // other palette
    accentOrange: "#F4A261",
    accentRed: "#E76F51",
    accentBlue: "#457B9D",

    background: "#F8F4E3",
    surface: "#FFFFFF",

    text: "#5E503F",
    textMuted: "#5E503F99",

    border: "#E9E2C8",
  },

  // Generic date/time formatting preferences
  dateFormat: "dd/MM/yyyy", // for display only; internally we use ISO (YYYY-MM-DD)
  timeFormat24h: false,

  // Default page size for tables (if you want to use it)
  defaultPageSize: 20,
};