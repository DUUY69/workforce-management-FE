import { useState, useEffect, useCallback, useMemo } from "react";
import { useSortableTable } from "@/hooks/useSortableTable";
import SortIcon from "@/components/SortIcon";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, Typography, Button, Chip } from "@material-tailwind/react";
import { PlusIcon, ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { fetchStores } from "@/utils/storesApi";
import { MobileCard, MobileListShell, MobileRow } from "@/components/mobile/MobileCard";
import { PayslipLines } from "@/components/PayslipLines";
import { useUrlFilters } from "@/utils/urlFilters";
import { formatPayrollDateTime } from "@/utils/dates";
import { formatMoney, formatHoursMinutes } from "@/utils/formatMoney";
import { exportPayrollListExcel } from "@/utils/exportPayrollExcel";

const nowInit = new Date();
const CURRENT_MONTH = String(nowInit.getMonth() + 1);
const CURRENT_YEAR = String(nowInit.getFullYear());
/** sentinel = xem mọi kỳ; mặc định = tháng/năm hiện tại */
const ALL = "__all__";
const PAYROLL_FILTER_DEFAULTS = {
  storeId: "",
  month: CURRENT_MONTH,
  year: CURRENT_YEAR,
  status: "",
};

const statusColors = { Draft: "indigo", Approved: "blue", Paid: "green" };
const statusLabels = { Draft: "Nháp", Approved: "Đã duyệt", Paid: "Đã trả" };
const confirmColors = { Pending: "amber", Confirmed: "green", AutoConfirmed: "teal", None: "gray" };
const confirmLabels = {
  Pending: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  AutoConfirmed: "Tự xác nhận",
  None: "—",
};

const sortPayrolls = (list) =>
  [...list].sort((a, b) => b.year - a.year || b.month - a.month || b.id - a.id);

const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
const yearOptions = Array.from(
  new Set([Number(CURRENT_YEAR), Number(CURRENT_YEAR) - 1, Number(CURRENT_YEAR) - 2, 2026, 2025, 2024])
).sort((a, b) => b - a);

export default function Payroll() {
  const navigate = useNavigate();
  const { isAdmin, isManager, isEmployee, isActingAsEmployee } = useAuth();
  const employeeView = isEmployee || isActingAsEmployee;
  const canManage = (isAdmin || isManager) && !employeeView;

  const [payrolls, setPayrolls] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [emptyHint, setEmptyHint] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [logPayroll, setLogPayroll] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const { values, setFilter, setFilters, clearFilters, searchString } = useUrlFilters(PAYROLL_FILTER_DEFAULTS, {
    storageKey: "filters:/dashboard/payroll",
  });
  const filter = values;
  const [genForm, setGenForm] = useState({
    storeId: "",
    month: CURRENT_MONTH,
    year: CURRENT_YEAR,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setEmptyHint(null);
    try {
      if (employeeView) {
        const payRes = await api.get("/payrolls/my");
        // Phiếu đã duyệt (cần xác nhận) + đã trả
        let allPayrolls = sortPayrolls(payRes.data.data || []);
        allPayrolls = allPayrolls.filter((p) => p.status === "Approved" || p.status === "Paid");
        if (filter.month && filter.month !== ALL) {
          allPayrolls = allPayrolls.filter((p) => String(p.month) === String(filter.month));
        }
        if (filter.year && filter.year !== ALL) {
          allPayrolls = allPayrolls.filter((p) => String(p.year) === String(filter.year));
        }
        setPayrolls(allPayrolls);
        setStores([]);
        return;
      }

      const params = new URLSearchParams();
      if (filter.storeId) params.set("storeId", filter.storeId);
      if (filter.month && filter.month !== ALL) params.set("month", filter.month);
      if (filter.year && filter.year !== ALL) params.set("year", filter.year);
      if (filter.status) params.set("status", filter.status);

      // Tách load: lỗi payroll không làm mất dropdown cửa hàng
      const storePromise = fetchStores(api, { isAdmin }).catch(() => []);
      let list = [];
      let payErr = null;
      try {
        const payRes = await api.get(`/payrolls?${params}`);
        list = sortPayrolls(payRes.data.data || []);
      } catch (e) {
        payErr = e;
        list = [];
      }
      const storeList = await storePromise;
      setPayrolls(list);
      setStores(storeList);

      const viewingCurrent =
        filter.month === CURRENT_MONTH && filter.year === CURRENT_YEAR && !filter.storeId;
      if (payErr) {
        setEmptyHint(payErr?.response?.data?.message || "Không tải được bảng lương (lỗi máy chủ). Thử lại sau khi restart API.");
      } else if (list.length === 0 && viewingCurrent) {
        setEmptyHint(
          `Chưa có bảng lương tháng ${CURRENT_MONTH}/${CURRENT_YEAR}. Bấm «Tính lương mới» sau khi đã có chấm công đã ra ca trong tháng.`
        );
      } else if (list.length === 0) {
        setEmptyHint("Không có bảng lương khớp bộ lọc. Thử đổi tháng/năm hoặc «Xem tháng này».");
      }
    } catch {
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  }, [employeeView, filter, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const payrollsWithPeriod = useMemo(
    () => payrolls.map((p) => ({ ...p, period: p.year * 100 + p.month })),
    [payrolls]
  );
  const { sorted, sortKey, sortDir, handleSort } = useSortableTable(payrollsWithPeriod);

  const listTotals = useMemo(() => {
    const rows = sorted || [];
    return {
      count: rows.length,
      employees: rows.reduce((s, p) => s + Number(p.employeeCount || p.details?.length || 0), 0),
      hours: rows.reduce(
        (s, p) => s + Number(p.totalWorkedHours ?? p.details?.[0]?.workedHours ?? 0),
        0
      ),
      cong: rows.reduce(
        (s, p) => s + Number(p.totalWorkedDays ?? p.details?.[0]?.workedDays ?? 0),
        0
      ),
      amount: rows.reduce((s, p) => s + Number(p.totalAmount || 0), 0),
      confirmed: rows.reduce((s, p) => s + Number(p.confirmedEmployeeCount || 0), 0),
    };
  }, [sorted]);

  const goCurrentPeriod = () => {
    setFilters({ month: CURRENT_MONTH, year: CURRENT_YEAR, storeId: "", status: "" });
  };

  const handleGenerate = async () => {
    if (!genForm.storeId) { alert("Chọn cửa hàng"); return; }
    setGenerating(true);
    try {
      await api.post("/payrolls/generate", {
        storeId: Number(genForm.storeId),
        month: Number(genForm.month),
        year: Number(genForm.year),
      });
      setShowGenerate(false);
      setFilters({ month: genForm.month, year: genForm.year });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Không tạo được bảng lương");
    } finally {
      setGenerating(false);
    }
  };

  const openDetail = (p) => {
    navigate(`/dashboard/payroll/${p.id}`, { state: { returnSearch: searchString } });
  };

  const openLogs = async (p, e) => {
    e?.stopPropagation?.();
    setLogPayroll(p);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await api.get(`/payrolls/${p.id}/logs`);
      setLogs(res.data.data || []);
    } catch (err) {
      alert(err?.response?.data?.message || "Không tải được log");
      setLogPayroll(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const canDeletePayroll = (p) => {
    if (!canManage) return false;
    if (isAdmin) return true;
    return p.status === "Draft";
  };

  const handleDelete = async (p, e) => {
    e?.stopPropagation?.();
    if (!canDeletePayroll(p)) {
      alert("Quản lý chỉ xóa được bảng Nháp. Liên hệ Admin để xóa bảng đã duyệt/đã trả.");
      return;
    }
    const label = `${p.storeName || "CH"} — T.${p.month}/${p.year} · tạo ${formatPayrollDateTime(p.createdAt)}`;
    if (!confirm(`Xóa bảng lương này?\n\n${label}\nTổng: ${Number(p.totalAmount).toLocaleString("en-US")} đ\n\nThao tác không hoàn tác.`)) {
      return;
    }
    setDeletingId(p.id);
    try {
      await api.delete(`/payrolls/${p.id}`);
      if (logPayroll?.id === p.id) setLogPayroll(null);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Không xóa được bảng lương");
    } finally {
      setDeletingId(null);
    }
  };

  const actionLabel = (a) => {
    if (a === "Created") return "Tạo bảng";
    if (a === "StatusChanged") return "Đổi trạng thái";
    if (a === "DetailUpdated") return "Sửa dòng";
    return a || "—";
  };

  const periodLabel =
    filter.month === ALL && filter.year === ALL
      ? "Mọi kỳ"
      : filter.month === ALL
        ? `Cả năm ${filter.year}`
        : filter.year === ALL
          ? `Tháng ${filter.month} (mọi năm)`
          : `Tháng ${filter.month}/${filter.year}`;

  const handleExportList = () => {
    if (!sorted?.length) {
      alert("Không có dữ liệu để xuất");
      return;
    }
    try {
      exportPayrollListExcel(sorted, { periodLabel });
    } catch (err) {
      alert(err?.message || "Không xuất được Excel");
    }
  };

  return (
    <div className="mt-4">
      <Card className="border border-blue-gray-100">
        <div className="p-4 border-b flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Typography variant="h6" color="blue-gray">Bảng lương</Typography>
              <Typography variant="small" color="gray" className="mt-0.5">
                Đang xem: <strong className="text-blue-gray-800">{periodLabel}</strong>
                {" · "}
                {payrolls.length} bảng
                {!loading && payrolls.length > 0 && (
                  <>
                    {" · "}Tổng tiền: <strong className="text-blue-gray-800">{formatMoney(listTotals.amount)}</strong>
                    {" · "}Giờ: <strong>{formatHoursMinutes(listTotals.hours)}</strong>
                    {" · "}Công: <strong>{Number(listTotals.cong).toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
                  </>
                )}
              </Typography>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {!employeeView && payrolls.length > 0 && (
                <Button
                  size="sm"
                  variant="outlined"
                  className="flex items-center gap-1 justify-center w-full sm:w-auto normal-case"
                  onClick={handleExportList}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" /> Xuất Excel tổng
                </Button>
              )}
              {canManage && (
                <Button size="sm" className="flex items-center gap-1 justify-center w-full sm:w-auto"
                  onClick={() => setShowGenerate(!showGenerate)}>
                  <PlusIcon className="w-4 h-4" /> Tính lương mới
                </Button>
              )}
            </div>
          </div>

          {canManage && showGenerate && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
              <Typography variant="small" className="font-semibold text-blue-gray-800">
                Tính lương theo cửa hàng & kỳ
              </Typography>
              <p className="text-xs text-blue-gray-600">
                Chỉ tính ca đã chấm ra (QL đã xác nhận). Mỗi lần bấm «Tính lương» tạo <strong>một bảng mới</strong> (không ghi đè bản cũ) — lưu người tạo, thời gian và lịch sử duyệt/sửa.
                Sau khi tạo (Nháp), vào chi tiết để nhập phụ cấp + ghi chú cho từng NV.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-blue-gray-600 font-medium mb-1 block">Cửa hàng *</label>
                  <select value={genForm.storeId} onChange={(e) => setGenForm({ ...genForm, storeId: e.target.value })}
                    className="w-full rounded-lg border border-blue-gray-200 px-3 py-2.5 text-sm bg-white">
                    <option value="">— Chọn —</option>
                    {stores.filter((s) => s.isActive).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-blue-gray-600 font-medium mb-1 block">Tháng *</label>
                  <select value={genForm.month} onChange={(e) => setGenForm({ ...genForm, month: e.target.value })}
                    className="w-full rounded-lg border border-blue-gray-200 px-3 py-2.5 text-sm bg-white">
                    {monthOptions.map((m) => <option key={m} value={m}>Tháng {m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-blue-gray-600 font-medium mb-1 block">Năm *</label>
                  <select value={genForm.year} onChange={(e) => setGenForm({ ...genForm, year: e.target.value })}
                    className="w-full rounded-lg border border-blue-gray-200 px-3 py-2.5 text-sm bg-white">
                    {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleGenerate} disabled={generating}>
                  {generating ? "Đang tính..." : "Tính lương"}
                </Button>
                <Button size="sm" variant="outlined" onClick={() => setShowGenerate(false)}>Hủy</Button>
              </div>
            </div>
          )}

          {canManage && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              <select value={filter.storeId} onChange={(e) => setFilter("storeId", e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm bg-white col-span-2 sm:col-span-1">
                <option value="">Tất cả CH</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={filter.month} onChange={(e) => setFilter("month", e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm bg-white">
                <option value={ALL}>Tất cả tháng</option>
                {monthOptions.map((m) => <option key={m} value={m}>T.{m}</option>)}
              </select>
              <select value={filter.year} onChange={(e) => setFilter("year", e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm bg-white">
                <option value={ALL}>Tất cả năm</option>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filter.status} onChange={(e) => setFilter("status", e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm bg-white">
                <option value="">Mọi TT</option>
                <option value="Draft">Nháp</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Paid">Đã trả</option>
              </select>
              <button type="button" onClick={goCurrentPeriod}
                className="text-xs text-blue-800 font-semibold py-2 px-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100">
                Tháng này
              </button>
              <button type="button" onClick={() => clearFilters()}
                className="text-xs text-blue-600 font-medium py-2 hover:underline">
                Về mặc định
              </button>
            </div>
          )}

          {employeeView && (
            <div className="flex flex-wrap gap-2 items-center">
              <select value={filter.month} onChange={(e) => setFilter("month", e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm bg-white">
                <option value={ALL}>Tất cả tháng</option>
                {monthOptions.map((m) => <option key={m} value={m}>T.{m}</option>)}
              </select>
              <select value={filter.year} onChange={(e) => setFilter("year", e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm bg-white">
                <option value={ALL}>Tất cả năm</option>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button type="button" onClick={goCurrentPeriod}
                className="text-xs text-blue-800 font-semibold py-2 px-2 rounded-lg border border-blue-200 bg-blue-50">
                Tháng này
              </button>
            </div>
          )}
        </div>

        <CardBody className="p-0">
          {!loading && payrolls.length === 0 && emptyHint && (
            <div className="p-4 mx-4 mt-4 mb-2 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-gray-700">
              {emptyHint}
              {canManage && (
                <button type="button" className="block mt-2 text-blue-600 font-medium text-xs"
                  onClick={() => setShowGenerate(true)}>
                  → Mở Tính lương mới
                </button>
              )}
            </div>
          )}

          <MobileListShell
            loading={loading}
            empty={!loading && payrolls.length === 0}
            emptyText={employeeView ? "Chưa có phiếu lương" : "Chưa có bảng lương"}
            count={payrolls.length}
          >
            {payrolls.map((p) => (
              <MobileCard key={p.id} onClick={() => openDetail(p)}>
                <div className="flex justify-between items-start gap-2">
                  <Typography variant="small" className="font-semibold text-blue-gray-900">
                    {p.storeName || "Cửa hàng"} — T.{p.month}/{p.year}
                  </Typography>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Chip size="sm" color={statusColors[p.status] || "gray"}
                      value={statusLabels[p.status] || p.status} className="normal-case" />
                    {employeeView && p.details?.[0]?.employeeConfirmStatus && p.details[0].employeeConfirmStatus !== "None" && (
                      <Chip size="sm" color={confirmColors[p.details[0].employeeConfirmStatus] || "gray"}
                        value={confirmLabels[p.details[0].employeeConfirmStatus] || p.details[0].employeeConfirmStatus}
                        className="normal-case" />
                    )}
                  </div>
                </div>
                {employeeView && p.details?.[0] && (
                  <>
                    <PayslipLines d={p.details[0]} compact />
                    <MobileRow label="Thực nhận">
                      <span className="font-bold text-green-700">{Number(p.details[0].netSalary).toLocaleString("en-US")} đ</span>
                    </MobileRow>
                    {p.status === "Approved" && p.employeeConfirmDeadline && p.details[0].employeeConfirmStatus === "Pending" && (
                      <Typography variant="small" className="text-xs text-amber-700 mt-1">
                        Hạn xác nhận: {formatPayrollDateTime(p.employeeConfirmDeadline)}
                      </Typography>
                    )}
                  </>
                )}
                {!employeeView && (
                  <>
                    <MobileRow label="Tổng lương">
                      {Number(p.totalAmount).toLocaleString("en-US")} đ
                    </MobileRow>
                    {(p.totalWorkedHours != null || p.totalWorkedDays != null) && (
                      <>
                        <MobileRow label="Tổng giờ">{formatHoursMinutes(p.totalWorkedHours)}</MobileRow>
                        <MobileRow label="Tổng công">
                          {Number(p.totalWorkedDays || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </MobileRow>
                      </>
                    )}
                    {(p.status === "Approved" || p.status === "Paid") && (
                      <MobileRow label="NV xác nhận">
                        {Number(p.confirmedEmployeeCount || 0)}/{Number(p.employeeCount || 0)}
                        {Number(p.pendingConfirmCount || 0) > 0 ? ` · chờ ${p.pendingConfirmCount}` : ""}
                      </MobileRow>
                    )}
                  </>
                )}
                <MobileRow label="Ngày tạo">{formatPayrollDateTime(p.createdAt)}</MobileRow>
                {canManage && p.createdByName && (
                  <MobileRow label="Người tạo">{p.createdByName}</MobileRow>
                )}
                {canManage && (
                  <div className="flex flex-wrap gap-3 mt-1">
                    <button
                      type="button"
                      className="text-xs text-blue-700 font-medium hover:underline"
                      onClick={(e) => openLogs(p, e)}
                    >
                      Log{p.auditLogCount ? ` (${p.auditLogCount})` : ""}
                    </button>
                    {canDeletePayroll(p) && (
                      <button
                        type="button"
                        className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                        disabled={deletingId === p.id}
                        onClick={(e) => handleDelete(p, e)}
                      >
                        {deletingId === p.id ? "Đang xóa..." : "Xóa"}
                      </button>
                    )}
                  </div>
                )}
                <Typography variant="small" color="gray" className="text-xs mt-1">Chạm để xem chi tiết</Typography>
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-2.5 text-center w-10">STT</th>
                  <th className="px-4 py-2.5 text-left cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("storeName")}>Cửa hàng <SortIcon active={sortKey === "storeName"} dir={sortDir} /></th>
                  <th className="px-4 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("period")}>Kỳ <SortIcon active={sortKey === "period"} dir={sortDir} /></th>
                  {!employeeView && (
                    <th className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("totalWorkedHours")}>
                      Tổng giờ <SortIcon active={sortKey === "totalWorkedHours"} dir={sortDir} />
                    </th>
                  )}
                  {!employeeView && (
                    <th className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("totalWorkedDays")}>
                      Tổng công <SortIcon active={sortKey === "totalWorkedDays"} dir={sortDir} />
                    </th>
                  )}
                  <th className="px-4 py-2.5 text-right cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("totalAmount")}>Tổng tiền <SortIcon active={sortKey === "totalAmount"} dir={sortDir} /></th>
                  <th className="px-4 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("createdAt")}>Ngày tạo <SortIcon active={sortKey === "createdAt"} dir={sortDir} /></th>
                  {canManage && <th className="px-4 py-2.5 text-left">Người tạo</th>}
                  {canManage && <th className="px-4 py-2.5 text-left">Người duyệt</th>}
                  {!employeeView && <th className="px-4 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("status")}>Trạng thái <SortIcon active={sortKey === "status"} dir={sortDir} /></th>}
                  {!employeeView && (
                    <th className="px-3 py-2.5 text-center" title="Số NV đã xác nhận / tổng NV">
                      NV xác nhận
                    </th>
                  )}
                  <th className="px-4 py-2.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={canManage ? 12 : (employeeView ? 6 : 10)} className="py-10 text-center text-gray-400">Đang tải...</td></tr>
                ) : payrolls.length === 0 ? (
                  <tr><td colSpan={canManage ? 12 : (employeeView ? 6 : 10)} className="py-10 text-center text-gray-400">
                    {employeeView ? "Chưa có phiếu lương đã duyệt/đã trả" : "Chưa có dữ liệu"}
                  </td></tr>
                ) : sorted.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                    <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{p.storeName}</td>
                    <td className="px-4 py-2.5 text-center">T.{p.month}/{p.year}</td>
                    {!employeeView && (
                      <td className="px-3 py-2.5 text-center whitespace-nowrap text-blue-gray-800">
                        {formatHoursMinutes(p.totalWorkedHours)}
                      </td>
                    )}
                    {!employeeView && (
                      <td className="px-3 py-2.5 text-center">
                        {Number(p.totalWorkedDays || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right font-medium">
                      {Number(p.totalAmount).toLocaleString("en-US")} đ
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-blue-gray-600 whitespace-nowrap">
                      {formatPayrollDateTime(p.createdAt)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-xs text-blue-gray-700 max-w-[120px] truncate" title={p.createdByName || ""}>
                        {p.createdByName || "—"}
                      </td>
                    )}
                    {canManage && (
                      <td className="px-4 py-2.5 text-xs text-blue-gray-700 max-w-[120px] truncate" title={p.approvedByName || ""}>
                        {p.approvedByName
                          ? `${p.approvedByName}${p.approvedAt ? ` · ${formatPayrollDateTime(p.approvedAt)}` : ""}`
                          : "—"}
                      </td>
                    )}
                    {!employeeView && (
                      <td className="px-4 py-2.5 text-center">
                        <Chip size="sm" color={statusColors[p.status] || "gray"}
                          value={statusLabels[p.status] || p.status} className="w-fit mx-auto normal-case" />
                      </td>
                    )}
                    {!employeeView && (
                      <td className="px-3 py-2.5 text-center text-xs whitespace-nowrap">
                        {(p.status === "Approved" || p.status === "Paid") ? (
                          <span className="font-semibold text-blue-gray-800">
                            {Number(p.confirmedEmployeeCount || 0)}/{Number(p.employeeCount || 0)}
                            {Number(p.pendingConfirmCount || 0) > 0 && (
                              <span className="block text-amber-700 font-normal">chờ {p.pendingConfirmCount}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-blue-gray-400">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button type="button" onClick={() => openDetail(p)}
                          className="text-xs text-blue-600 hover:underline">Xem</button>
                        {canManage && (
                          <button type="button" onClick={(e) => openLogs(p, e)}
                            className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                            Log{p.auditLogCount ? ` (${p.auditLogCount})` : ""}
                          </button>
                        )}
                        {canDeletePayroll(p) && (
                          <button
                            type="button"
                            disabled={deletingId === p.id}
                            onClick={(e) => handleDelete(p, e)}
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deletingId === p.id ? "..." : "Xóa"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !employeeView && sorted.length > 0 && (
                  <tr className="bg-blue-gray-50 border-t-2 border-blue-200 font-semibold">
                    <td className="px-4 py-3 text-center text-xs text-blue-gray-500" colSpan={3}>
                      TỔNG ({listTotals.count} bảng
                      {listTotals.employees ? ` · ${listTotals.employees} NV` : ""})
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap text-blue-900">
                      {formatHoursMinutes(listTotals.hours)}
                    </td>
                    <td className="px-3 py-3 text-center text-blue-900">
                      {Number(listTotals.cong).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-900">
                      {formatMoney(listTotals.amount)}
                    </td>
                    <td className="px-4 py-3" colSpan={canManage ? 4 : 2} />
                    <td className="px-3 py-3 text-center text-blue-900 text-xs">
                      {listTotals.confirmed}/{listTotals.employees}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && !employeeView && sorted.length > 0 && (
            <div className="md:hidden mx-4 mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm space-y-1">
              <p className="font-semibold text-blue-gray-900">Tổng danh sách ({listTotals.count} bảng)</p>
              <MobileRow label="Tổng giờ">{formatHoursMinutes(listTotals.hours)}</MobileRow>
              <MobileRow label="Tổng công">{Number(listTotals.cong).toLocaleString("en-US", { maximumFractionDigits: 2 })}</MobileRow>
              <MobileRow label="Tổng tiền"><span className="font-bold">{formatMoney(listTotals.amount)}</span></MobileRow>
              <MobileRow label="NV xác nhận">{listTotals.confirmed}/{listTotals.employees}</MobileRow>
              <Button size="sm" variant="outlined" className="w-full mt-2 normal-case flex items-center justify-center gap-1" onClick={handleExportList}>
                <ArrowDownTrayIcon className="w-4 h-4" /> Xuất Excel tổng
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {logPayroll && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setLogPayroll(null)} aria-label="Đóng" />
          <div className="relative bg-white w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col">
            <div className="p-4 border-b">
              <Typography variant="h6" color="blue-gray">Log chỉnh sửa</Typography>
              <Typography variant="small" color="gray">
                {logPayroll.storeName} — T.{logPayroll.month}/{logPayroll.year}
                {" · "}Tạo: {formatPayrollDateTime(logPayroll.createdAt)}
                {logPayroll.createdByName ? ` · ${logPayroll.createdByName}` : ""}
              </Typography>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {logsLoading ? (
                <p className="text-sm text-gray-400 text-center py-8">Đang tải...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Chưa có log (bảng cũ trước khi bật audit).</p>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="rounded-lg border border-blue-gray-100 px-3 py-2 text-sm">
                    <div className="flex justify-between gap-2 items-start">
                      <span className="font-semibold text-blue-gray-800">{actionLabel(l.action)}</span>
                      <span className="text-xs text-blue-gray-500 whitespace-nowrap">{formatPayrollDateTime(l.createdAt)}</span>
                    </div>
                    {l.fromStatus || l.toStatus ? (
                      <p className="text-xs text-blue-gray-600 mt-0.5">
                        {statusLabels[l.fromStatus] || l.fromStatus || "—"}
                        {" → "}
                        {statusLabels[l.toStatus] || l.toStatus || "—"}
                      </p>
                    ) : null}
                    {l.message && <p className="text-xs text-blue-gray-700 mt-1">{l.message}</p>}
                    <p className="text-xs text-blue-gray-500 mt-1">Bởi {l.changedByName || "—"}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t flex justify-end">
              <Button size="sm" variant="outlined" onClick={() => setLogPayroll(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
