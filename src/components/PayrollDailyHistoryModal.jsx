import { useEffect, useState } from "react";
import { Typography, Button } from "@material-tailwind/react";
import api from "@/api";
import { formatAmount, formatHoursMinutes, formatMoney } from "@/utils/formatMoney";

function formatDateVi(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Popup lịch sử ngày làm trong kỳ lương: vào/ra, giờ, công, tiền.
 */
export default function PayrollDailyHistoryModal({ open, payrollId, detailId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !payrollId || !detailId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      setData(null);
      try {
        const res = await api.get(`/payrolls/${payrollId}/details/${detailId}/daily`);
        if (!cancelled) setData(res.data.data);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || "Không tải được lịch sử ngày làm.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, payrollId, detailId]);

  if (!open) return null;

  const days = data?.days || [];

  return (
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Đóng" />
      <div className="relative bg-white w-full sm:max-w-3xl max-h-[90vh] rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col">
        <div className="p-4 border-b">
          <Typography variant="h6" color="blue-gray">Lịch sử ngày làm</Typography>
          {data ? (
            <Typography variant="small" color="gray">
              {data.employeeName} ({data.employeeCode}) — T.{data.month}/{data.year}
              {" · "}
              {data.salaryType === "Monthly" ? "Lương tháng" : "Lương giờ"}
            </Typography>
          ) : (
            <Typography variant="small" color="gray">Chi tiết vào/ra theo từng ngày trong kỳ</Typography>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {loading && <p className="text-sm text-gray-400 text-center py-10">Đang tải...</p>}
          {error && <p className="text-sm text-red-500 text-center py-10">{error}</p>}
          {!loading && !error && days.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">Không có ca đã xác nhận trong kỳ.</p>
          )}
          {!loading && !error && days.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-lg border border-blue-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-gray-50 text-blue-gray-700 text-xs">
                      <th className="px-3 py-2 text-left">Ngày</th>
                      <th className="px-3 py-2 text-center">Vào</th>
                      <th className="px-3 py-2 text-center">Ra</th>
                      <th className="px-3 py-2 text-center">Giờ</th>
                      <th className="px-3 py-2 text-center">Công</th>
                      <th className="px-3 py-2 text-right">Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((row, i) => (
                      <tr key={`${row.workDate}-${row.checkIn}-${i}`} className={i % 2 ? "bg-blue-50/20" : "bg-white"}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="font-medium text-blue-gray-800">{formatDateVi(row.workDate)}</div>
                          {row.holidayName && (
                            <div className="text-[10px] text-amber-700">
                              Lễ: {row.holidayName}
                              {row.holidayMultiplier ? ` ×${row.holidayMultiplier}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-xs">{row.checkIn}</td>
                        <td className="px-3 py-2 text-center font-mono text-xs">{row.checkOut}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">{formatHoursMinutes(row.hours)}</td>
                        <td className="px-3 py-2 text-center">
                          {Number(row.cong).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{formatAmount(row.pay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-blue-gray-900">
                <span>Tổng giờ: <span className="text-blue-800">{formatHoursMinutes(data.totalHours)}</span></span>
                <span>Tổng công: <span className="text-blue-800">{Number(data.totalCong).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span></span>
                <span className="ml-auto">Tổng tiền ngày: <span className="text-blue-900">{formatMoney(data.totalPay)}</span></span>
              </div>
              <p className="text-[11px] text-blue-gray-500 mt-2 leading-snug">
                Tiền theo ngày là ước tính từ chấm công (đã gồm hệ số ngày lễ nếu có). Thưởng / phụ cấp / khấu trừ tháng xem ở phiếu lương.
              </p>
            </>
          )}
        </div>

        <div className="p-3 border-t flex justify-end">
          <Button size="sm" variant="outlined" onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </div>
  );
}
