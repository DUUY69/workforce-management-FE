import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Typography, IconButton } from "@material-tailwind/react";
import { Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@/context/AuthContext";
import { dashboardRoutesConfig, getRoutesForRole } from "@/routes";

export default function Dashboard() {
  const { currentUser, logout, isAdmin, isManager } = useAuth();
  const [sideOpen, setSideOpen] = useState(false);
  const navigate = useNavigate();
  const menuItems = getRoutesForRole(currentUser?.role);

  const BOTTOM_NAV = {
    Admin:    ["/home", "/stores", "/employees", "/attendance", "/payroll"],
    Manager:  ["/home", "/employees", "/attendance", "/shift-registrations", "/payroll"],
    Employee: ["/home", "/shift-registrations", "/attendance", "/payroll"],
  };
  const bottomItems = (BOTTOM_NAV[currentUser?.role] || [])
    .map((p) => menuItems.find((m) => m.path === p))
    .filter(Boolean);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen bg-blue-gray-50/50">
      {/* Backdrop mobile */}
      {sideOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 xl:hidden" onClick={() => setSideOpen(false)} />
      )}

      {/* Sidenav */}
      <aside className={`fixed top-0 left-0 z-40 h-full w-72 bg-white shadow-xl transition-transform duration-300
        ${sideOpen ? "translate-x-0" : "-translate-x-full"} xl:translate-x-0`}>
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <Typography variant="h6" color="blue-gray">Workforce Mgmt</Typography>
          <IconButton variant="text" className="xl:hidden" onClick={() => setSideOpen(false)}>
            <XMarkIcon className="w-5 h-5" />
          </IconButton>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {menuItems.map(({ path, name, icon }) => (
            <NavLink key={path} to={`/dashboard${path}`} end={path === "/home"}
              onClick={() => setSideOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? "bg-blue-600 text-white" : "text-blue-gray-600 hover:bg-blue-gray-50"}`
              }>
              {icon}
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {currentUser?.fullName?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-gray-800 truncate">{currentUser?.fullName}</p>
              <p className="text-xs text-blue-gray-400">{currentUser?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col min-h-screen xl:ml-72">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center gap-3">
          <IconButton variant="text" className="xl:hidden" onClick={() => setSideOpen(true)}>
            <Bars3Icon className="w-5 h-5" />
          </IconButton>
          <Typography variant="h6" color="blue-gray" className="flex-1">Workforce Management</Typography>
        </header>

        <main className="flex-1 p-3 sm:p-4 pb-24 xl:pb-8 max-w-[100vw] overflow-x-hidden">
          <Routes>
            {dashboardRoutesConfig.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
          </Routes>
        </main>
      </div>

      {/* Bottom nav mobile */}
      {bottomItems.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-blue-gray-100 shadow-lg xl:hidden safe-area-bottom">
          <div className="flex h-16 items-stretch">
            {bottomItems.map(({ path, name, icon }) => (
              <NavLink key={path} to={`/dashboard${path}`} end={path === "/home"} className="flex-1 min-w-0">
                {({ isActive }) => (
                  <div className={`relative flex flex-col items-center justify-center h-full gap-0.5 px-0.5
                    ${isActive ? "text-blue-600" : "text-blue-gray-400"}`}>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
                    )}
                    <span className={isActive ? "scale-110 transition-transform" : ""}>{icon}</span>
                    <span className={`text-[10px] leading-tight truncate w-full text-center ${isActive ? "font-semibold" : ""}`}>
                      {name}
                    </span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

