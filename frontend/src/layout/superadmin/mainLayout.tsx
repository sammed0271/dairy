// src/layout/mainLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import { useState } from "react";
// import Navbar from "./navbar";

const MainLayout: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <div className="p-3 border-b flex items-center justify-between">
          <button
            className="md:hidden"
            onClick={() => setOpen(true)}
          >
            ☰
          </button>

          <h1 className="font-semibold">Superadmin</h1>
        </div>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;