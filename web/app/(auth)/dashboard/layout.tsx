import React from "react";
import Sidebar from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar fijo */}
      <Sidebar />

      {/* Contenido dinámico */}
      <main className="flex-1 p-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
