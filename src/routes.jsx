import {
  HomeIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/solid";

import Home from "@/pages/dashboard/Home";
import Stores from "@/pages/dashboard/Stores";
import Employees from "@/pages/dashboard/Employees";
import ShiftRegistrations from "@/pages/dashboard/ShiftRegistrations";
import Attendance from "@/pages/dashboard/Attendance";
import Payroll from "@/pages/dashboard/Payroll";
import PayrollDetail from "@/pages/dashboard/PayrollDetail";
import Reports from "@/pages/dashboard/Reports";

const icon = { className: "w-5 h-5 text-inherit" };

export const dashboardRoutesConfig = [
  { path: "/home",                element: <Home />,               name: "Dashboard",      icon: <HomeIcon {...icon} />,                    roles: ["Admin","Manager","Employee"] },
  { path: "/stores",              element: <Stores />,             name: "Cửa hàng",       icon: <BuildingStorefrontIcon {...icon} />,       roles: ["Admin"] },
  { path: "/employees",           element: <Employees />,          name: "Nhân viên",      icon: <UserGroupIcon {...icon} />,               roles: ["Admin","Manager"] },
  { path: "/shift-registrations", element: <ShiftRegistrations />, name: "Đăng ký ca",     icon: <CalendarDaysIcon {...icon} />,            roles: ["Admin","Manager","Employee"] },
  { path: "/attendance",          element: <Attendance />,         name: "Chấm công",      icon: <ClipboardDocumentCheckIcon {...icon} />,  roles: ["Admin","Manager","Employee"] },
  { path: "/payroll",             element: <Payroll />,            name: "Bảng lương",     icon: <BanknotesIcon {...icon} />,               roles: ["Admin","Manager","Employee"] },
  { path: "/payroll/:id",         element: <PayrollDetail />,      name: null,             icon: null,                                      roles: ["Admin","Manager"] },
  { path: "/reports",             element: <Reports />,            name: "Báo cáo",        icon: <ChartBarIcon {...icon} />,                roles: ["Admin","Manager"] },
];

export function getRoutesForRole(role) {
  if (!role) return [];
  return dashboardRoutesConfig.filter((r) => r.name && r.roles.includes(role));
}
