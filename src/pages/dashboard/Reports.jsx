import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, Typography, Button } from "@material-tailwind/react";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { fetchStores } from "@/utils/storesApi";
import { MobileCard, MobileListShell, MobileRow } from "@/components/mobile/MobileCard";

export default function Reports() {
  const { isAdmin } = useAuth();
  const [stores, setStores] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ storeId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  useEffect(() => {
    fetchStores(api, { isAdmin }).then(setStores).catch(() => {});
  }, [isAdmin]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: filter.month, year: filter.year });
      if (filter.storeId) params.set("storeId", filter.storeId);
      const res = await api.get(`/attendance/summary?${params}`);
      setSummary(res.data.data || []);
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="mt-4">
      <Card className="border border-blue-gray-100">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Typography variant="h6" color="blue-gray">Báo cáo Chấm công</Typography>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={filter.storeId} onChange={(e) => setFilter({ ...filter, storeId: e.target.value })}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm">
                <option value="">{isAdmin ? "Tất cả cửa hàng" : "Tất cả CH của tôi"}</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm">
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
              </select>
              <input type="number" value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm w-20" />
              <Button size="sm" onClick={loadReport}>Xem báo cáo</Button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <MobileListShell loading={loading} empty={!loading && summary.length === 0} emptyText='Nhấn "Xem báo cáo" để tải dữ liệu' count={summary.length || null}>
            {summary.map((s) => (
              <MobileCard key={s.employeeId}>
                <Typography variant="small" className="font-semibold">{s.employeeName}</Typography>
                <Typography variant="small" color="gray" className="font-mono text-xs">{s.employeeCode}</Typography>
                <MobileRow label="Ngày công">{s.workedDays}</MobileRow>
                <MobileRow label="Tổng giờ">{Number(s.workedHours).toFixed(1)}h</MobileRow>
                <MobileRow label="OT">{s.overtimeHours > 0 ? `${s.overtimeHours}h` : "—"}</MobileRow>
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2.5 text-left">Mã NV</th>
                <th className="px-4 py-2.5 text-left">Họ tên</th>
                <th className="px-4 py-2.5 text-center">Ngày công</th>
                <th className="px-4 py-2.5 text-center">Tổng giờ</th>
                <th className="px-4 py-2.5 text-center">OT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : summary.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">Nhấn "Xem báo cáo" để tải dữ liệu</td></tr>
              ) : summary.map((s, i) => (
                <tr key={s.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.employeeCode}</td>
                  <td className="px-4 py-2.5 font-medium">{s.employeeName}</td>
                  <td className="px-4 py-2.5 text-center font-semibold">{s.workedDays}</td>
                  <td className="px-4 py-2.5 text-center">{Number(s.workedHours).toFixed(1)}h</td>
                  <td className="px-4 py-2.5 text-center">{s.overtimeHours > 0 ? `${s.overtimeHours}h` : "—"}</td>
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
