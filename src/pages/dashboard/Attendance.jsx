import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardBody, Typography, Button, Chip } from "@material-tailwind/react";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { formatDateVi } from "@/utils/dates";
import { MobileCard, MobileListShell, MobileRow } from "@/components/mobile/MobileCard";

const statusColors = { Worked: "green", Absent: "red" };

export default function Attendance() {
  const { isAdmin, isManager, isEmployee } = useAuth();
  const canManage = isAdmin || isManager;
  const [records, setRecords] = useState([]);
  const [pendingShifts, setPendingShifts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStore, setFilterStore] = useState("");
  const [viewMonth, setViewMonth] = useState(false);

  const monthRange = (isoDate) => {
    const [y, m] = isoDate.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return {
      from: `${y}-${String(m).padStart(2, "0")}-01`,
      to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) {
        const { from, to } = viewMonth ? monthRange(filterDate) : { from: filterDate, to: filterDate };
        params.set("dateFrom", from);
        params.set("dateTo", to);
      }
      if (filterStore) params.set("storeId", filterStore);

      const shiftParams = new URLSearchParams({ status: "Approved" });
      if (filterDate) {
        const { from, to } = viewMonth ? monthRange(filterDate) : { from: filterDate, to: filterDate };
        shiftParams.set("dateFrom", from);
        shiftParams.set("dateTo", to);
      }
      if (filterStore) shiftParams.set("storeId", filterStore);

      const reqs = [
        api.get(`/attendance?${params}`),
        canManage ? api.get(isAdmin ? "/stores" : "/stores/assigned") : Promise.resolve({ data: { data: [] } }),
        canManage && !viewMonth ? api.get(`/shift-registrations?${shiftParams}`) : Promise.resolve({ data: { data: [] } }),
      ];
      const results = await Promise.all(reqs);
      const list = results[0].data.data || [];
      setRecords(list);
      setStores(results[1].data.data || []);

      if (canManage && !viewMonth) {
        const shifts = results[2].data.data || [];
        const done = new Set(
          list.map((r) => `${r.employeeId}-${r.storeId}-${(r.workDate || "").slice(0, 10)}`)
        );
        setPendingShifts(
          shifts.filter((s) => !done.has(`${s.employeeId}-${s.storeId}-${(s.workDate || "").slice(0, 10)}`))
        );
      } else setPendingShifts([]);
    } catch {} finally { setLoading(false); }
  }, [filterDate, filterStore, viewMonth, canManage, isAdmin]);

  useEffect(() => { load(); }, [filterDate, filterStore, viewMonth]);

  const handleConfirmShift = async (shift, worked) => {
    const label = worked ? "Đi làm" : "Không đi làm";
    const time = shift.shiftTime || `${shift.startTime}–${shift.endTime}`;
    const msg = worked
      ? `Xác nhận ${shift.employeeName} ĐI LÀM ca ${time}?`
      : `Xác nhận ${shift.employeeName} KHÔNG ĐI LÀM ca ${time}?`;
    if (!confirm(msg)) return;

    setConfirmingId(shift.id);
    try {
      await api.post("/attendance/confirm-shift", {
        shiftRegistrationId: shift.id,
        worked,
      });
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Lỗi");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa xác nhận chấm công? NV sẽ quay lại danh sách chờ xác nhận.")) return;
    try { await api.delete(`/attendance/${id}`); load(); }
    catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  const statusLabel = (r) => r.statusLabel || (r.status === "Worked" ? "Đi làm" : r.status === "Absent" ? "Không đi làm" : r.status || "—");

  const todayIso = new Date().toISOString().slice(0, 10);

  const goToday = () => {
    setViewMonth(false);
    setFilterDate(todayIso);
  };

  return (
    <div className="mt-4">
      <Card className="border border-blue-gray-100">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Typography variant="h6" color="blue-gray">
                {isEmployee ? "Lịch sử chấm công" : "Chấm công"}
              </Typography>
              {filterDate && (
                <Typography variant="small" className="text-blue-gray-500 font-normal">
                  {viewMonth
                    ? `Tháng ${filterDate.slice(5, 7)}/${filterDate.slice(0, 4)}`
                    : `Ngày ${formatDateVi(filterDate)}`}
                </Typography>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setViewMonth(false); }}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm" />
              {!viewMonth && filterDate !== todayIso && (
                <Button size="sm" variant="text" className="text-blue-600" onClick={goToday}>Hôm nay</Button>
              )}
              <label className="flex items-center gap-1.5 text-sm text-blue-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={viewMonth} onChange={(e) => setViewMonth(e.target.checked)}
                  className="rounded border-blue-gray-300" />
                Cả tháng
              </label>
              {canManage && (
                <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}
                  className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm">
                  <option value="">Tất cả cửa hàng</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {isEmployee && (
            <div className="px-4 py-3 border-b bg-amber-50/80">
              <Typography variant="small" className="text-amber-900 text-sm leading-relaxed">
                Quản lý xác nhận <strong>Đi làm</strong> hoặc <strong>Không đi làm</strong> theo ca đã duyệt. Bạn chỉ xem kết quả.
              </Typography>
            </div>
          )}

          {canManage && !viewMonth && (
            <div className="px-4 py-3 border-b bg-blue-50/50 text-sm text-blue-gray-800 leading-relaxed">
              <strong>Xác nhận chấm công:</strong> chọn <strong>Đi làm</strong> hoặc <strong>Không đi làm</strong> — giờ lấy tự động từ ca đã duyệt, không cần nhập tay.
            </div>
          )}

          {canManage && !viewMonth && pendingShifts.length > 0 && (
            <div className="p-4 border-b bg-amber-50/60">
              <Typography variant="small" className="font-semibold text-amber-900 mb-2">
                Chờ xác nhận ({pendingShifts.length})
              </Typography>
              <ul className="space-y-2">
                {pendingShifts.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border border-amber-100 text-sm">
                    <span className="font-medium">{s.employeeName}</span>
                    <span className="text-blue-gray-500">{s.storeName}</span>
                    <span>{formatDateVi(s.workDate?.slice(0, 10))}</span>
                    <span className="font-mono text-blue-gray-600">{s.shiftTime || `${s.startTime}–${s.endTime}`}</span>
                    <div className="flex gap-2 ml-auto w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outlined"
                        color="red"
                        className="flex-1 sm:flex-none"
                        disabled={confirmingId === s.id}
                        onClick={() => handleConfirmShift(s, false)}
                      >
                        Không đi làm
                      </Button>
                      <Button
                        size="sm"
                        color="green"
                        className="flex-1 sm:flex-none"
                        disabled={confirmingId === s.id}
                        onClick={() => handleConfirmShift(s, true)}
                      >
                        Đi làm
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canManage && !viewMonth && pendingShifts.length === 0 && records.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-sm text-blue-gray-500">
              Không có ca đã duyệt chờ xác nhận ngày {formatDateVi(filterDate)}.
              Kiểm tra <strong>Đăng ký ca</strong> đã duyệt chưa.
            </div>
          )}

          <MobileListShell
            loading={loading}
            empty={!loading && records.length === 0}
            emptyText={
              viewMonth
                ? `Chưa có xác nhận trong tháng ${filterDate?.slice(5, 7)}/${filterDate?.slice(0, 4)}.`
                : pendingShifts.length > 0
                  ? `Chưa xác nhận — dùng nút phía trên.`
                  : `Chưa có chấm công ngày ${formatDateVi(filterDate)}.`
            }
            count={records.length}
          >
            {records.map((r) => (
              <MobileCard key={r.id}>
                <Typography variant="small" className="font-semibold">{r.employeeName}</Typography>
                <Typography variant="small" color="gray" className="text-xs font-mono">{r.employeeCode}</Typography>
                <MobileRow label="Cửa hàng">{r.storeName}</MobileRow>
                <MobileRow label="Ngày">{formatDateVi(r.workDate?.slice(0, 10))}</MobileRow>
                {r.status === "Worked" && (
                  <>
                    <MobileRow label="Giờ vào">{r.checkIn}</MobileRow>
                    <MobileRow label="Giờ ra">{r.checkOut || "—"}</MobileRow>
                    <MobileRow label="Số giờ">{Number(r.workedHours).toFixed(1)}h</MobileRow>
                    <MobileRow label="OT">{r.overtimeHours > 0 ? `+${Number(r.overtimeHours).toFixed(1)}h` : "—"}</MobileRow>
                  </>
                )}
                <MobileRow label="Trạng thái">
                  <Chip size="sm" color={statusColors[r.status] || "gray"} value={statusLabel(r)} className="w-fit ml-auto normal-case" />
                </MobileRow>
                {canManage && (
                  <button type="button" onClick={() => handleDelete(r.id)} className="text-xs text-red-500 font-medium pt-1 border-t border-blue-gray-100 w-full text-left">
                    Xóa (xác nhận lại)
                  </button>
                )}
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2.5 text-left">Nhân viên</th>
                <th className="px-4 py-2.5 text-left">Cửa hàng</th>
                <th className="px-4 py-2.5 text-center">Ngày</th>
                <th className="px-4 py-2.5 text-center">Vào</th>
                <th className="px-4 py-2.5 text-center">Ra</th>
                <th className="px-4 py-2.5 text-center">Số giờ</th>
                <th className="px-4 py-2.5 text-center">OT</th>
                <th className="px-4 py-2.5 text-center">TT</th>
                {canManage && <th className="px-4 py-2.5 text-center">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 px-4 text-center text-gray-500 text-sm">
                    {pendingShifts.length > 0
                      ? "Chưa xác nhận — dùng nút «Đi làm» / «Không đi làm» phía trên."
                      : `Chưa có chấm công ngày ${formatDateVi(filterDate)}.`}
                  </td>
                </tr>
              ) : records.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="px-4 py-2.5 font-medium">{r.employeeName} <span className="text-xs text-gray-400">({r.employeeCode})</span></td>
                  <td className="px-4 py-2.5 text-gray-600">{r.storeName}</td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">{formatDateVi(r.workDate?.slice(0, 10))}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{r.status === "Worked" ? r.checkIn : "—"}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{r.status === "Worked" ? (r.checkOut || "—") : "—"}</td>
                  <td className="px-4 py-2.5 text-center">{r.status === "Worked" ? `${Number(r.workedHours).toFixed(1)}h` : "—"}</td>
                  <td className="px-4 py-2.5 text-center">{r.status === "Worked" && r.overtimeHours > 0 ? `+${r.overtimeHours}h` : "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Chip size="sm" color={statusColors[r.status] || "gray"} value={statusLabel(r)} className="w-fit mx-auto normal-case" />
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Xóa</button>
                    </td>
                  )}
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
