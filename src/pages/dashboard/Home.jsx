import { useEffect, useState } from "react";
import { Card, CardBody, Typography, Button } from "@material-tailwind/react";
import { UserGroupIcon, BuildingStorefrontIcon, ClipboardDocumentCheckIcon, BanknotesIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import SalaryModal from "@/components/SalaryModal";
import { fetchStores } from "@/utils/storesApi";

export default function Home() {
  const { currentUser, isAdmin, isManager, isEmployee } = useAuth();
  const [stats, setStats] = useState({ employees: 0, stores: 0, attendanceToday: 0 });
  const [showMySalary, setShowMySalary] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, storeList] = await Promise.all([
          api.get("/employees?isActive=true"),
          fetchStores(api, { isAdmin }),
        ]);
        setStats(s => ({
          ...s,
          employees: empRes.data.data?.length || 0,
          stores: storeList.length,
        }));
      } catch {}
    };
    if (!isEmployee) load();
  }, [isEmployee, isAdmin]);

  const cards = isAdmin || isManager ? [
    { label: "Nhân viên", value: stats.employees, icon: <UserGroupIcon className="w-8 h-8 text-blue-600" />, color: "blue" },
    { label: "Cửa hàng", value: stats.stores, icon: <BuildingStorefrontIcon className="w-8 h-8 text-green-600" />, color: "green" },
    { label: "Chấm công hôm nay", value: stats.attendanceToday, icon: <ClipboardDocumentCheckIcon className="w-8 h-8 text-orange-600" />, color: "orange" },
  ] : [
    { label: "Lịch làm tuần này", value: "—", icon: <ClipboardDocumentCheckIcon className="w-8 h-8 text-blue-600" />, color: "blue" },
    { label: "Lương tháng này", value: "—", icon: <BanknotesIcon className="w-8 h-8 text-green-600" />, color: "green" },
  ];

  const myEmployeeProfile = isEmployee && currentUser?.employeeId
    ? {
        id: currentUser.employeeId,
        fullName: currentUser.fullName,
        employeeCode: currentUser.employeeCode || "",
        currentSalary: null,
      }
    : null;

  return (
    <div className="mt-4">
      <SalaryModal
        open={showMySalary && !!myEmployeeProfile}
        employee={myEmployeeProfile}
        canEdit={false}
        onClose={() => setShowMySalary(false)}
      />
      <Typography variant="h5" color="blue-gray" className="mb-6">
        Xin chào, {currentUser?.fullName} 👋
      </Typography>
      {isEmployee && currentUser?.employeeId && (
        <Card className="border border-blue-gray-100 mb-4">
          <CardBody className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Typography variant="small" className="font-semibold text-blue-gray-800">Tiến trình lương</Typography>
              <Typography variant="small" color="gray">Xem các mức lương đã áp dụng theo thời gian</Typography>
            </div>
            <Button size="sm" variant="outlined" onClick={() => setShowMySalary(true)}>
              Lịch sử lương của tôi
            </Button>
          </CardBody>
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border border-blue-gray-100">
            <CardBody className="flex items-center gap-4 p-5">
              <div className={`p-3 rounded-xl bg-${c.color}-50`}>{c.icon}</div>
              <div>
                <Typography variant="small" color="gray">{c.label}</Typography>
                <Typography variant="h4" color="blue-gray">{c.value}</Typography>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
