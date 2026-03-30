// src/layout/mainLayout.tsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import Navbar from "./navbar";

const MainLayout: React.FC = () => {
  // single sidebar state
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setOpen(true)} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
