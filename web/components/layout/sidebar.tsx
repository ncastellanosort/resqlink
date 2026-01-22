"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaExclamationTriangle, FaSignOutAlt, FaTags } from "react-icons/fa";

export default function Sidebar() {
  const router = useRouter();

  const links = [
    { name: "Incidentes", href: "/dashboard/incidents", icon: <FaExclamationTriangle /> },
    { name: "Tipos de Recursos", href: "/dashboard/resource-types", icon: <FaTags /> },
  ];

  const handleLogout = () => {
    // Limpiar el token y datos de sesión
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    sessionStorage.clear();

    // Redirigir a la raíz (donde está el login)
    router.replace("/");
    
    // Fallback con redirect completo
    setTimeout(() => {
      window.location.href = "/";
    }, 100);
  };

  return (
    <aside className="w-64 bg-linear-to-b from-red-700 to-red-900 text-white flex flex-col h-screen shadow-lg">
      <div className="p-6 flex items-center justify-center border-b border-red-600">
        <h1 className="text-2xl font-bold tracking-tight">ResQLink</h1>
      </div>

      <nav className="flex-1 overflow-y-auto mt-4">
        <ul className="space-y-1 px-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-200"
              >
                <span className="text-lg">{link.icon}</span>
                <span className="font-medium">{link.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-red-600">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-700 transition-colors duration-200 font-medium"
        >
          <span className="text-lg">
            <FaSignOutAlt />
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>

      <div className="p-4 border-t border-red-600 text-sm text-red-200 text-center">
        © 2026 ResQLink
      </div>
    </aside>
  );
}