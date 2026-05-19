import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardBody, Typography, Button, Chip } from "@material-tailwind/react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { MobileCard, MobileListShell, MobileRow } from "@/components/mobile/MobileCard";
import { formatHourlyRate } from "@/utils/formatMoney";

const statusColors = { Draft: "indigo", Approved: "blue", Paid: "green" };
const statusLabels = { Draft: "Nháp", Approved: "Đã duyệt", Paid: "Đã trả" };

export default function PayrollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const res = await api.get(`/payrolls/${id}`); setPayroll(res.data.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="mt-12 text-center text-gray-400">Đang tải...</div>;
  if (!payroll) return <div className="mt-12 text-center text-red-400">Không tìm thấy bảng lương.</div>;

  return (
    <div className="mt-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        <ArrowLeftIcon className="w-4 h-4" /> Quay lại
      </button>
      <Card className="border border-blue-gray-100">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h6" color="blue-gray">{payroll.storeName} — Tháng {payroll.month}/{payroll.year}</Typography>
              <Typography variant="small" color="gray">Tổng: {Number(payroll.totalAmount).toLocaleString("vi-VN")} đ</Typography>
            </div>
            <Chip size="sm" color={statusColors[payroll.status] || "gray"} value={statusLabels[payroll.status] || payroll.status} />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <MobileListShell loading={false} empty={(payroll.details || []).length === 0} emptyText="Không có dữ liệu" count={(payroll.details || []).length}>
            {(payroll.details || []).map((d) => (
              <MobileCard key={d.id}>
                <Typography variant="small" className="font-semibold">{d.employeeName}</Typography>
                <Typography variant="small" color="gray" className="text-xs font-mono">{d.employeeCode}</Typography>
                <MobileRow label="Ngày công">{d.workedDays}</MobileRow>
                <MobileRow label="Số giờ">{Number(d.workedHours).toFixed(1)}h</MobileRow>
                <MobileRow label="Lương/giờ">{formatHourlyRate(d)}</MobileRow>
                <MobileRow label="Hệ số">×{d.coefficient}</MobileRow>
                <MobileRow label="Thực nhận"><span className="text-blue-gray-900 font-bold">{Number(d.netSalary).toLocaleString("vi-VN")} đ</span></MobileRow>
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2.5 text-left">Nhân viên</th>
                <th className="px-4 py-2.5 text-center">Ngày công</th>
                <th className="px-4 py-2.5 text-center">Số giờ</th>
                <th className="px-4 py-2.5 text-right">Lương/giờ</th>
                <th className="px-4 py-2.5 text-center">Hệ số</th>
                <th className="px-4 py-2.5 text-right">Lương gộp</th>
                <th className="px-4 py-2.5 text-right">Thưởng</th>
                <th className="px-4 py-2.5 text-right">Khấu trừ</th>
                <th className="px-4 py-2.5 text-right font-bold">Thực nhận</th>
              </tr>
            </thead>
            <tbody>
              {(payroll.details || []).length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : (payroll.details || []).map((d, i) => (
                <tr key={d.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="px-4 py-2.5 font-medium">{d.employeeName} <span className="text-xs text-gray-400">({d.employeeCode})</span></td>
                  <td className="px-4 py-2.5 text-center">{d.workedDays}</td>
                  <td className="px-4 py-2.5 text-center">{Number(d.workedHours).toFixed(1)}h</td>
                  <td className="px-4 py-2.5 text-right">{formatHourlyRate(d)}</td>
                  <td className="px-4 py-2.5 text-center">×{d.coefficient}</td>
                  <td className="px-4 py-2.5 text-right">{Number(d.grossSalary).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2.5 text-right text-green-600">{d.bonus > 0 ? `+${Number(d.bonus).toLocaleString("vi-VN")}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{d.deduction > 0 ? `-${Number(d.deduction).toLocaleString("vi-VN")}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-blue-gray-800">{Number(d.netSalary).toLocaleString("vi-VN")} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
