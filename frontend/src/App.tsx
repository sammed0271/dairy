// src/App.tsx
import React, { Suspense, useEffect } from "react";
// import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Loader from "./components/loader";

import { syncMilkData } from "./utils/syncMilk";
import AppRoutes from "./routes/AppRoutes";




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
      <AppRoutes />

    </Suspense>
  );
};

export default App;
