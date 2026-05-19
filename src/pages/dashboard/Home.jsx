import { useEffect, useState } from "react";
import { Card, CardBody, Typography, Button, Chip } from "@material-tailwind/react";
import { UserGroupIcon, BuildingStorefrontIcon, ClipboardDocumentCheckIcon, BanknotesIcon } from "@heroicons/react/24/solid";
import { useAuth } from "@/context/AuthContext";
import api from "@/api";
import SalaryModal from "@/components/SalaryModal";
import BankInfoModal, { formatBankLine } from "@/components/BankInfoModal";
import { fetchStores } from "@/utils/storesApi";
import { formatDateVi, getWeekRangeISO } from "@/utils/dates";
import { formatMoney } from "@/utils/formatMoney";

export default function Home() {
  const { currentUser, refreshUser, isAdmin, isManager, isEmployee } = useAuth();
  const [stats, setStats] = useState({ employees: 0, stores: 0, attendanceToday: 0 });
  const [showMySalary, setShowMySalary] = useState(false);
  const [showMyBank, setShowMyBank] = useState(false);
  const [weekShifts, setWeekShifts] = useState([]);
  const [monthPayLabel, setMonthPayLabel] = useState("—");
  const weekRange = getWeekRangeISO();

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

  useEffect(() => {
    if (!isEmployee) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const { from, to } = getWeekRangeISO(now);
    const params = new URLSearchParams({ status: "Approved", dateFrom: from, dateTo: to });
    (async () => {
      try {
        const [shiftRes, payRes] = await Promise.all([
          api.get(`/shift-registrations?${params}`),
          api.get("/payrolls/my"),
        ]);
        setWeekShifts(shiftRes.data.data || []);
        const rows = payRes.data.data || [];
        const thisMonth = rows.filter((p) => p.year === year && p.month === month);
        if (thisMonth.length === 0) setMonthPayLabel("—");
        else {
          const total = thisMonth.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
          setMonthPayLabel(formatMoney(total));
        }
      } catch {
        setWeekShifts([]);
        setMonthPayLabel("—");
      }
    })();
  }, [isEmployee]);

  const cards = isAdmin || isManager ? [
    { label: "Nhân viên", value: stats.employees, icon: <UserGroupIcon className="w-8 h-8 text-blue-600" />, color: "blue" },
    { label: "Cửa hàng", value: stats.stores, icon: <BuildingStorefrontIcon className="w-8 h-8 text-green-600" />, color: "green" },
    { label: "Chấm công hôm nay", value: stats.attendanceToday, icon: <ClipboardDocumentCheckIcon className="w-8 h-8 text-orange-600" />, color: "orange" },
  ] : [
    {
      label: "Lịch làm tuần này",
      value: weekShifts.length ? `${weekShifts.length} ca` : "0 ca",
      icon: <ClipboardDocumentCheckIcon className="w-8 h-8 text-blue-600" />,
      color: "blue",
    },
    {
      label: "Lương tháng này",
      value: monthPayLabel,
      icon: <BanknotesIcon className="w-8 h-8 text-green-600" />,
      color: "green",
    },
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
      {isEmployee && currentUser?.employeeId && (
        <BankInfoModal
          open={showMyBank}
          employee={{
            id: currentUser.employeeId,
            fullName: currentUser.fullName,
            employeeCode: currentUser.employeeCode,
            bankAccountNo: currentUser.bankAccountNo,
            bankName: currentUser.bankName,
            bankAccountName: currentUser.bankAccountName,
          }}
          canEdit
          onClose={() => setShowMyBank(false)}
          onSaved={refreshUser}
        />
      )}
      <Typography variant="h5" color="blue-gray" className="mb-6">
        Xin chào, {currentUser?.fullName} 👋
      </Typography>
      {isEmployee && currentUser?.employeeId && (
        <>
          <Card className="border border-blue-gray-100 mb-4">
            <CardBody className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Typography variant="small" className="font-semibold text-blue-gray-800">Tài khoản nhận lương</Typography>
                <Typography variant="small" color="gray" className="mt-1 block">
                  {formatBankLine(currentUser)}
                </Typography>
              </div>
              <Button size="sm" variant="outlined" color="indigo" onClick={() => setShowMyBank(true)}>
                Cập nhật STK
              </Button>
            </CardBody>
          </Card>
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
        </>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="border border-blue-gray-100">
            <CardBody className="flex items-center gap-4 p-5">
              <div className={`p-3 rounded-xl bg-${c.color}-50`}>{c.icon}</div>
              <div>
                <Typography variant="small" color="gray">{c.label}</Typography>
                <Typography variant="h4" color="blue-gray" className="text-xl sm:text-2xl break-words">{c.value}</Typography>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {isEmployee && (
        <Card className="border border-blue-gray-100 mt-4">
          <CardBody className="p-4">
            <Typography variant="small" className="font-semibold text-blue-gray-800 mb-1">
              Ca đã duyệt tuần này ({formatDateVi(weekRange.from)} – {formatDateVi(weekRange.to)})
            </Typography>
            <Typography variant="small" color="gray" className="mb-3 block">
              Chỉ hiển thị ca <strong>Đã duyệt</strong>. Chấm công thực tế xem mục Chấm công.
            </Typography>
            {weekShifts.length === 0 ? (
              <Typography variant="small" color="gray">Chưa có ca được duyệt trong tuần.</Typography>
            ) : (
              <ul className="space-y-2">
                {weekShifts.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm border-b border-blue-gray-50 pb-2 last:border-0">
                    <span className="font-medium text-blue-gray-800">{formatDateVi(s.workDate?.slice(0, 10))}</span>
                    <span className="text-blue-gray-600">{s.shiftTime || `${s.startTime}–${s.endTime}`}</span>
                    <span className="text-blue-gray-500">{s.storeName}</span>
                    <Chip size="sm" color="green" value="Đã duyệt" className="normal-case" />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
