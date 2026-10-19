import { useState, useEffect, useMemo } from "react";
import { useSortableTable } from "@/hooks/useSortableTable";
import SortIcon from "@/components/SortIcon";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardBody, Typography, Button, Chip } from "@material-tailwind/react";
import { ArrowLeftIcon, ArrowDownTrayIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { MobileCard, MobileListShell, MobileRow, MobileField, MobileTextInput } from "@/components/mobile/MobileCard";
import { PayslipLines } from "@/components/PayslipLines";
import PayrollDailyHistoryModal from "@/components/PayrollDailyHistoryModal";
import {
  formatHourlyRate,
  formatMoney,
  formatAmount,
  formatAmountInput,
  formatHoursMinutes,
  splitHoursMinutes,
  hoursFromParts,
  numberFromAmountInput,
  isMonthlySalary,
  salaryTypeLabel,
} from "@/utils/formatMoney";
import { formatBankLine } from "@/components/BankInfoModal";
import { buildReturnSearch } from "@/utils/urlFilters";
import { formatPayrollDateTime } from "@/utils/dates";
import { exportPayrollExcel } from "@/utils/exportPayrollExcel";

const statusColors = { Draft: "indigo", Approved: "blue", Paid: "green" };
const statusLabels = { Draft: "Nháp", Approved: "Đã duyệt", Paid: "Đã trả" };
const confirmColors = { Pending: "amber", Confirmed: "green", AutoConfirmed: "teal", None: "gray" };
const confirmLabels = {
  Pending: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  AutoConfirmed: "Tự xác nhận (hết hạn)",
  None: "—",
};

function calcNet(d) {
  return Number(d.grossSalary) + Number(d.bonus) + Number(d.deliveryAllowance || 0) - Number(d.deduction);
}

function displayAttendanceDays(d) {
  const att = Number(d.attendanceDays);
  if (Number.isFinite(att) && att > 0) return att;
  return null;
}

function displayCongDays(d) {
  const w = Number(d.workedDays);
  return Number.isFinite(w) ? w : 0;
}

function moneyOrEmpty(v) {
  if (v == null || v === "" || Number(v) === 0) return "";
  return formatAmount(v);
}

function parseEditMoney(raw, fallback = 0) {
  if (raw === "" || raw == null) return Number(fallback) || 0;
  const n = numberFromAmountInput(raw);
  return Number.isFinite(n) ? n : Number(fallback) || 0;
}

function parseEditNumber(raw, fallback = 0) {
  if (raw === "" || raw == null) return Number(fallback) || 0;
  const n = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : Number(fallback) || 0;
}

function notePreview(note) {
  if (!note) return "—";
  const one = String(note).replace(/\s+/g, " ").trim();
  return one.length > 42 ? `${one.slice(0, 42)}…` : one;
}

function noteParts(note) {
  if (!note) return [];
  return String(note)
    .split(/\s*;\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cột mức lương — chỉ xem, kèm loại Tháng/Giờ. */
function RateDisplay({ d }) {
  const label = salaryTypeLabel(d);
  const text = formatHourlyRate(d);
  if (text === "—") return <span className="text-blue-gray-400">—</span>;
  return (
    <div className="inline-flex flex-col items-end gap-0.5 leading-tight">
      <span className="font-medium text-blue-gray-800 whitespace-nowrap">{text}</span>
      {label ? (
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            label === "Tháng" ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"
          }`}
        >
          {label === "Tháng" ? "Lương tháng" : "Lương giờ"}
        </span>
      ) : null}
    </div>
  );
}

function editHoursDecimal(e, fallback) {
  if (e?.hoursH != null || e?.hoursM != null) {
    return hoursFromParts(e.hoursH, e.hoursM);
  }
  return parseEditNumber(e?.workedHours, fallback);
}

/** Ước lương gộp khi Admin đổi giờ/công/mức (không gồm phụ cấp ngày lễ đã cộng tay). */
function estimateGross(d, { hours, cong, rate } = {}) {
  const coef = Number(d.coefficient) > 0 ? Number(d.coefficient) : 1;
  const r = rate != null ? Number(rate) : Number(d.baseSalaryPerHour) || 0;
  if (!Number.isFinite(r) || r <= 0) return null;
  if (isMonthlySalary(d)) {
    const workedDays = cong != null ? Number(cong) : Number(d.workedDays) || 0;
    const monthlyPay = r * coef;
    const congForPay = Math.min(workedDays, 26);
    const missing = Math.max(0, 26 - congForPay);
    return Math.max(0, Math.round(monthlyPay - (monthlyPay / 26) * missing));
  }
  const h = hours != null ? Number(hours) : Number(d.workedHours) || 0;
  return Math.max(0, Math.round(h * r * coef));
}

/** Ô nhập tiền có dấu phẩy hàng nghìn (3,000) — chỉ nhận số. */
function MoneyInput({ value, onChange, className = "", placeholder = "0", disabled }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9,]*"
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      value={value ?? ""}
      onChange={(ev) => onChange(formatAmountInput(ev.target.value))}
      onKeyDown={(ev) => {
        // Chặn chữ / ký tự lạ; cho phép điều khiển + số + dấu phẩy
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        const ok = ["Backspace", "Delete", "Tab", "Enter", "ArrowLeft", "ArrowRight", "Home", "End"].includes(ev.key)
          || /^[0-9]$/.test(ev.key)
          || ev.key === ","
          || ev.key === "-";
        if (!ok) ev.preventDefault();
      }}
      onPaste={(ev) => {
        ev.preventDefault();
        const text = ev.clipboardData?.getData("text") ?? "";
        onChange(formatAmountInput(text));
      }}
      onBlur={(ev) => {
        const n = numberFromAmountInput(ev.target.value);
        if (Number.isFinite(n)) onChange(formatAmount(n));
        else if (ev.target.value === "" || ev.target.value === "-") onChange("");
      }}
    />
  );
}

/** Nhập số giờ dạng 103h + 55p. */
function HoursPartsInput({ hoursH, hoursM, onChange, className = "" }) {
  const normalize = (hRaw, mRaw) => {
    let h = Math.max(0, Math.floor(Number(hRaw) || 0));
    let m = Math.max(0, Math.floor(Number(mRaw) || 0));
    if (m >= 60) {
      h += Math.floor(m / 60);
      m %= 60;
    }
    onChange(String(h), String(m));
  };
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        title="Giờ"
        className="w-12 text-center rounded border border-blue-gray-200 px-1 py-1 text-sm"
        value={hoursH ?? ""}
        onChange={(ev) => onChange(ev.target.value, hoursM ?? "0")}
        onBlur={() => normalize(hoursH, hoursM)}
      />
      <span className="text-xs text-blue-gray-500">h</span>
      <input
        type="number"
        min={0}
        max={59}
        step={1}
        inputMode="numeric"
        title="Phút"
        className="w-11 text-center rounded border border-blue-gray-200 px-1 py-1 text-sm"
        value={hoursM ?? ""}
        onChange={(ev) => onChange(hoursH ?? "0", ev.target.value)}
        onBlur={() => normalize(hoursH, hoursM)}
      />
      <span className="text-xs text-blue-gray-500">p</span>
    </div>
  );
}

function buildInitEdits(details) {
  const init = {};
  (details || []).forEach((d) => {
    const { h, m } = splitHoursMinutes(d.workedHours);
    init[d.id] = {
      deliveryAllowance: moneyOrEmpty(d.deliveryAllowance),
      note: d.note || "",
      bonus: moneyOrEmpty(d.bonus),
      deduction: moneyOrEmpty(d.deduction),
      grossSalary: moneyOrEmpty(d.grossSalary) || (d.grossSalary != null ? formatAmount(d.grossSalary) : ""),
      workedDays: d.workedDays != null ? String(d.workedDays) : "",
      attendanceDays: d.attendanceDays != null ? String(d.attendanceDays) : "",
      hoursH: String(h),
      hoursM: String(m),
      baseSalaryPerHour: moneyOrEmpty(d.baseSalaryPerHour) || (d.baseSalaryPerHour != null ? formatAmount(d.baseSalaryPerHour) : ""),
      bankName: d.bankName || "",
      bankAccountName: d.bankAccountName || "",
      bankAccountNo: d.bankAccountNo || "",
    };
  });
  return init;
}

export default function PayrollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backToList = () => navigate(`/dashboard/payroll${buildReturnSearch(location)}`);
  const { isEmployee, isAdmin, isManager, isActingAsEmployee } = useAuth();
  const employeeView = isEmployee || isActingAsEmployee;
  const canManage = (isAdmin || isManager) && !employeeView;
  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [noteModal, setNoteModal] = useState(null); // { detailId, name, canEdit }
  const [dayHistory, setDayHistory] = useState(null); // { detailId }

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = employeeView
        ? await api.get("/payrolls/my")
        : await api.get(`/payrolls/${id}`);
      const data = employeeView
        ? (res.data.data || []).find((item) => String(item.id) === String(id))
        : res.data.data;
      setPayroll(data);
      setEdits(buildInitEdits(data?.details));
    } catch (err) {
      setPayroll(null);
      setLoadError(err?.response?.data?.message || "Không tải được bảng lương. Thử lại hoặc kiểm tra quyền cửa hàng.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id, employeeView]);

  const details = payroll?.details ?? [];
  const { sorted, sortKey, sortDir, handleSort } = useSortableTable(details, "workedHours", "desc");
  const canEdit = (payroll?.status === "Draft" || isAdmin) && !employeeView;
  const myLine = employeeView ? details[0] : null;

  const totalAmount = useMemo(() => {
    if (!payroll) return 0;
    return details.reduce((s, d) => {
      const e = edits[d.id];
      const allowance = e ? parseEditMoney(e.deliveryAllowance, d.deliveryAllowance) : Number(d.deliveryAllowance || 0);
      const bonus = e ? parseEditMoney(e.bonus, d.bonus) : Number(d.bonus || 0);
      const deduction = e ? parseEditMoney(e.deduction, d.deduction) : Number(d.deduction || 0);
      const gross = e ? parseEditMoney(e.grossSalary, d.grossSalary) : Number(d.grossSalary || 0);
      return s + gross + bonus + allowance - deduction;
    }, 0);
  }, [payroll, details, edits]);

  const detailTotals = useMemo(() => {
    let hours = 0;
    let cong = 0;
    let att = 0;
    for (const d of details) {
      const e = edits[d.id];
      hours += editHoursDecimal(e, d.workedHours);
      const wd = e?.workedDays != null && e.workedDays !== ""
        ? parseEditNumber(e.workedDays, d.workedDays)
        : Number(d.workedDays || 0);
      cong += Number.isFinite(wd) ? wd : 0;
      const a = e?.attendanceDays != null && e.attendanceDays !== ""
        ? parseEditNumber(e.attendanceDays, d.attendanceDays)
        : Number(d.attendanceDays);
      if (Number.isFinite(a) && a > 0) att += a;
    }
    return { hours, cong, att, count: details.length };
  }, [details, edits]);

  const setEdit = (detailId, field, value) => {
    setEdits((prev) => ({ ...prev, [detailId]: { ...prev[detailId], [field]: value } }));
  };

  const patchEdit = (detailId, patch) => {
    setEdits((prev) => ({ ...prev, [detailId]: { ...prev[detailId], ...patch } }));
  };

  /** Đổi giờ/phút → cập nhật ngày công (~8h=1) + lương gộp. */
  const setHoursParts = (d, hoursH, hoursM) => {
    const decimal = hoursFromParts(hoursH, hoursM);
    const hoursPerCong = 8;
    const cong = Math.round((decimal / hoursPerCong) * 100) / 100;
    const patch = {
      hoursH,
      hoursM,
      workedDays: String(cong),
    };
    const rate = Number(d.baseSalaryPerHour) || 0;
    if (isMonthlySalary(d)) {
      const g = estimateGross(d, { cong, rate });
      if (g != null) patch.grossSalary = formatAmount(g);
    } else {
      const g = estimateGross(d, { hours: decimal, rate });
      if (g != null) patch.grossSalary = formatAmount(g);
    }
    patchEdit(d.id, patch);
  };

  /** Đổi ngày công → (lương tháng) tự điền lại lương gộp. */
  const setWorkedDaysEdit = (d, raw) => {
    const patch = { workedDays: raw };
    if (isMonthlySalary(d) && raw !== "") {
      const cong = parseEditNumber(raw, d.workedDays);
      const rate = Number(d.baseSalaryPerHour) || 0;
      const g = estimateGross(d, { cong, rate });
      if (g != null) patch.grossSalary = formatAmount(g);
    }
    patchEdit(d.id, patch);
  };

  const openNoteModal = (d) => {
    setNoteModal({
      detailId: d.id,
      name: `${d.employeeName} (${d.employeeCode})`,
      canEdit,
    });
  };

  const saveRow = async (d) => {
    const e = edits[d.id] || {};
    const needsReconfirm =
      isAdmin && (payroll?.status === "Approved" || payroll?.status === "Paid");
    if (needsReconfirm) {
      const ok = confirm(
        `Lưu thay đổi cho ${d.employeeName}?\n\n` +
          `Bảng đã ${statusLabels[payroll.status] || payroll.status}. ` +
          `Nếu thay đổi ảnh hưởng lương/ngân hàng, NV sẽ phải xác nhận lại phiếu lương của mình.`,
      );
      if (!ok) return;
    }
    setSavingId(d.id);
    try {
      const body = {
        deliveryAllowance: parseEditMoney(e.deliveryAllowance, 0),
        note: e.note || null,
        bonus: e.bonus !== "" && e.bonus != null ? parseEditMoney(e.bonus, 0) : undefined,
        deduction: e.deduction !== "" && e.deduction != null ? parseEditMoney(e.deduction, 0) : undefined,
      };
      if (isAdmin) {
        if (e.grossSalary !== "" && e.grossSalary != null) body.grossSalary = parseEditMoney(e.grossSalary, 0);
        if (e.workedDays !== "" && e.workedDays != null) body.workedDays = parseEditNumber(e.workedDays, 0);
        if (e.attendanceDays !== "" && e.attendanceDays != null) body.attendanceDays = parseEditNumber(e.attendanceDays, 0);
        body.workedHours = editHoursDecimal(e, d.workedHours);
        body.bankName = e.bankName ?? "";
        body.bankAccountName = e.bankAccountName ?? "";
        body.bankAccountNo = e.bankAccountNo ?? "";
      }
      await api.put(`/payrolls/${id}/details/${d.id}`, body);
      await load();
      if (needsReconfirm) {
        alert(`Đã lưu ${d.employeeName}. Nếu có thay đổi lương/TK, NV cần xác nhận lại phiếu.`);
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Lỗi lưu");
    } finally {
      setSavingId(null);
    }
  };

  const changeStatus = async (action) => {
    const labels = {
      approve:
        "Duyệt bảng lương này? Sau khi duyệt, NV sẽ được yêu cầu xác nhận phiếu trong thời hạn cấu hình; hết hạn hệ thống tự xác nhận đúng. QL không sửa phụ cấp được nữa (Admin vẫn sửa được).",
      pay: "Đánh dấu đã trả lương cho toàn bộ NV trong bảng này?",
      revert:
        payroll?.status === "Paid"
          ? "Thu hồi về Nháp? Sẽ xóa ghi nhận đã trả lương của bảng này. Chỉ Admin được làm."
          : "Thu hồi về Nháp để chỉnh sửa / tính lại? Chỉ Admin được làm.",
    };
    if (!confirm(labels[action])) return;
    setStatusBusy(true);
    try {
      if (action === "approve") await api.patch(`/payrolls/${id}/approve`);
      else if (action === "pay") await api.patch(`/payrolls/${id}/pay`);
      else await api.patch(`/payrolls/${id}/revert-draft`);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Không đổi được trạng thái");
    } finally {
      setStatusBusy(false);
    }
  };

  const confirmMine = async () => {
    if (!confirm("Xác nhận phiếu lương này đúng?")) return;
    setConfirmBusy(true);
    try {
      await api.post(`/payrolls/${id}/confirm-mine`);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Không xác nhận được");
    } finally {
      setConfirmBusy(false);
    }
  };

  const loadLogs = async () => {
    setShowLogs(true);
    setLogsLoading(true);
    try {
      const res = await api.get(`/payrolls/${id}/logs`);
      setLogs(res.data.data || []);
    } catch (err) {
      alert(err?.response?.data?.message || "Không tải được log");
      setShowLogs(false);
    } finally {
      setLogsLoading(false);
    }
  };

  const actionLabel = (a) => {
    if (a === "Created") return "Tạo bảng";
    if (a === "StatusChanged") return "Đổi trạng thái";
    if (a === "DetailUpdated") return "Sửa dòng";
    return a || "—";
  };

  if (loading) return <div className="mt-12 text-center text-gray-400">Đang tải...</div>;
  if (!payroll) {
    return (
      <div className="mt-8 max-w-md mx-auto text-center space-y-3 px-4">
        <p className="text-red-500 text-sm">{loadError || "Không tìm thấy bảng lương."}</p>
        <button type="button" onClick={backToList} className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách
        </button>
        <button type="button" onClick={load} className="block mx-auto text-xs text-blue-gray-500 hover:underline">
          Thử tải lại
        </button>
      </div>
    );
  }

  if (employeeView && myLine) {
    const conf = myLine.employeeConfirmStatus || "None";
    const needConfirm =
      (conf === "Pending" || conf === "None") &&
      (payroll.status === "Approved" || payroll.status === "Paid");
    return (
      <div className="mt-4 max-w-lg mx-auto">
        <button onClick={backToList} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
          <ArrowLeftIcon className="w-4 h-4" /> Quay lại
        </button>
        <Card className="border border-blue-gray-100">
          <div className="p-4 border-b">
            <Typography variant="h6" color="blue-gray">Phiếu lương T.{payroll.month}/{payroll.year}</Typography>
            <Typography variant="small" color="gray">{payroll.storeName}</Typography>
            <Typography variant="small" color="gray" className="text-xs mt-0.5">
              Tạo: {formatPayrollDateTime(payroll.createdAt)}
              {payroll.approvedAt ? ` · Duyệt: ${formatPayrollDateTime(payroll.approvedAt)}` : ""}
            </Typography>
            <div className="flex flex-wrap gap-2 mt-2">
              <Chip size="sm" className="w-fit normal-case" color={statusColors[payroll.status] || "gray"}
                value={statusLabels[payroll.status] || payroll.status} />
              {conf !== "None" && (
                <Chip size="sm" className="w-fit normal-case" color={confirmColors[conf] || "gray"}
                  value={confirmLabels[conf] || conf} />
              )}
              {needConfirm && conf === "None" && (
                <Chip size="sm" className="w-fit normal-case" color="amber" value="Chờ xác nhận" />
              )}
            </div>
            {needConfirm && payroll.employeeConfirmDeadline && (
              <Typography variant="small" className="text-xs text-amber-700 mt-2">
                Vui lòng xác nhận trước {formatPayrollDateTime(payroll.employeeConfirmDeadline)}. Hết hạn hệ thống tự xác nhận đúng.
              </Typography>
            )}
            {needConfirm && !payroll.employeeConfirmDeadline && (
              <Typography variant="small" className="text-xs text-amber-700 mt-2">
                Phiếu đã duyệt — vui lòng xác nhận số liệu lương bên dưới.
              </Typography>
            )}
            {myLine.employeeConfirmedAt && conf !== "Pending" && conf !== "None" && (
              <Typography variant="small" className="text-xs text-blue-gray-500 mt-1">
                Xác nhận lúc: {formatPayrollDateTime(myLine.employeeConfirmedAt)}
              </Typography>
            )}
          </div>
          <CardBody className="p-4 space-y-3">
            <PayslipLines d={myLine} />
            <Button
              fullWidth
              variant="outlined"
              className="normal-case"
              onClick={() => setDayHistory({ detailId: myLine.id })}
            >
              Xem lịch sử ngày làm (vào/ra, công, tiền)
            </Button>
            {needConfirm && (
              <Button fullWidth color="green" size="lg" className="normal-case text-base" disabled={confirmBusy} onClick={confirmMine}>
                {confirmBusy ? "Đang xác nhận..." : "Xác nhận phiếu lương đúng"}
              </Button>
            )}
          </CardBody>
        </Card>
        <PayrollDailyHistoryModal
          open={!!dayHistory}
          payrollId={id}
          detailId={dayHistory?.detailId}
          onClose={() => setDayHistory(null)}
        />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button onClick={backToList} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        <ArrowLeftIcon className="w-4 h-4" /> Quay lại
      </button>
      <Card className="border border-blue-gray-100">
        <div className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Typography variant="h6" color="blue-gray">{payroll.storeName} — Tháng {payroll.month}/{payroll.year}</Typography>
              <Typography variant="small" color="gray">
                Tổng: {formatMoney(totalAmount)}
                {" · "}Tạo: {formatPayrollDateTime(payroll.createdAt)}
                {payroll.createdByName ? ` (${payroll.createdByName})` : ""}
                {payroll.approvedAt
                  ? ` · Duyệt: ${formatPayrollDateTime(payroll.approvedAt)}${payroll.approvedByName ? ` (${payroll.approvedByName})` : ""}`
                  : ""}
              </Typography>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" color={statusColors[payroll.status] || "gray"} value={statusLabels[payroll.status] || payroll.status} />
              {canManage && payroll.status === "Draft" && (
                <Button size="sm" color="blue" className="normal-case" disabled={statusBusy}
                  onClick={() => changeStatus("approve")}>
                  {statusBusy ? "Đang duyệt..." : "Duyệt bảng lương"}
                </Button>
              )}
              {canManage && payroll.status === "Approved" && (
                <Button size="sm" color="green" className="normal-case" disabled={statusBusy}
                  onClick={() => changeStatus("pay")}>
                  {statusBusy ? "Đang xử lý..." : "Đánh dấu đã trả"}
                </Button>
              )}
              {isAdmin && (payroll.status === "Approved" || payroll.status === "Paid") && (
                <Button size="sm" variant="outlined" color="amber" className="normal-case" disabled={statusBusy}
                  onClick={() => changeStatus("revert")}>
                  {statusBusy ? "Đang thu hồi..." : "Thu hồi về Nháp"}
                </Button>
              )}
              {canManage && (
                <Button size="sm" variant="outlined" className="normal-case flex items-center gap-1"
                  onClick={() => {
                    try {
                      const rows = details.map((d) => {
                        const e = edits[d.id] || {};
                        return {
                          ...d,
                          deliveryAllowance: parseEditMoney(e.deliveryAllowance, d.deliveryAllowance),
                          bonus: parseEditMoney(e.bonus, d.bonus),
                          deduction: parseEditMoney(e.deduction, d.deduction),
                          grossSalary: parseEditMoney(e.grossSalary, d.grossSalary),
                          workedDays: parseEditNumber(e.workedDays, d.workedDays),
                          attendanceDays: parseEditNumber(e.attendanceDays, d.attendanceDays),
                          workedHours: editHoursDecimal(e, d.workedHours),
                          bankName: e.bankName ?? d.bankName,
                          bankAccountName: e.bankAccountName ?? d.bankAccountName,
                          bankAccountNo: e.bankAccountNo ?? d.bankAccountNo,
                        };
                      });
                      exportPayrollExcel(payroll, rows, { getNet: calcNet });
                    } catch (err) {
                      alert(err?.message || "Không xuất được Excel");
                    }
                  }}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" /> Xuất Excel
                </Button>
              )}
              {canManage && (
                <Button size="sm" variant="outlined" className="normal-case" onClick={loadLogs}>
                  Xem log{payroll.auditLogCount ? ` (${payroll.auditLogCount})` : ""}
                </Button>
              )}
              {((isAdmin) || (canManage && payroll.status === "Draft")) && (
                <Button
                  size="sm"
                  variant="outlined"
                  color="red"
                  className="normal-case"
                  disabled={statusBusy}
                  onClick={async () => {
                    const label = `${payroll.storeName} — T.${payroll.month}/${payroll.year}`;
                    if (!confirm(`Xóa bảng lương này?\n\n${label}\n\nThao tác không hoàn tác.`)) return;
                    setStatusBusy(true);
                    try {
                      await api.delete(`/payrolls/${id}`);
                      backToList();
                    } catch (err) {
                      alert(err?.response?.data?.message || "Không xóa được");
                    } finally {
                      setStatusBusy(false);
                    }
                  }}
                >
                  Xóa bảng lương
                </Button>
              )}
            </div>
          </div>
          {canEdit && (
            <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {isAdmin
                ? <>Admin sửa được giờ+phút, công, lương gộp, thưởng… (không sửa <strong>mức lương</strong> — lấy từ hồ sơ NV, có nhãn Tháng/Giờ). Bấm <strong>Lưu</strong> từng dòng. Cột <strong>Chi tiết</strong> xem vào/ra từng ngày.</>
                : <>Nháp — nhập phụ cấp/ghi chú rồi bấm <strong>Lưu</strong>. Tiền có dấu phẩy hàng nghìn. Xong bấm <strong>Duyệt bảng lương</strong>.</>}
            </p>
          )}
          <p className="text-[11px] text-blue-gray-500 mt-2 leading-snug">
            <strong>Ngày đi làm</strong> = số ngày lịch có mặt (đi làm là đếm 1, dù chỉ 3h).{" "}
            <strong>Ngày công</strong> = quy đổi giờ (đủ ~8h mới = 1 công; 3h ≈ 0,4 công). Lương giờ trả theo số giờ; lương tháng trả theo công (chuẩn 26). Bản cũ thiếu cột này → bấm tính lại bảng lương.
          </p>
          {(payroll.status === "Approved" || payroll.status === "Paid") && payroll.employeeConfirmDeadline && (
            <p className="text-[11px] text-amber-800 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-snug">
              Hạn NV xác nhận phiếu: <strong>{formatPayrollDateTime(payroll.employeeConfirmDeadline)}</strong>
              {" "}— hết hạn hệ thống tự đánh dấu đúng.
            </p>
          )}
        </div>
        <CardBody className="p-0">
          <MobileListShell loading={false} empty={details.length === 0} emptyText="Không có dữ liệu" count={details.length}>
            {details.map((d) => {
              const e = edits[d.id] || {};
              const net = calcNet({
                ...d,
                deliveryAllowance: parseEditMoney(e.deliveryAllowance, d.deliveryAllowance),
                bonus: parseEditMoney(e.bonus, d.bonus),
                deduction: parseEditMoney(e.deduction, d.deduction),
                grossSalary: parseEditMoney(e.grossSalary, d.grossSalary),
              });
              return (
                <MobileCard key={d.id}>
                  <Typography variant="small" className="font-semibold">{d.employeeName}</Typography>
                  <Typography variant="small" color="gray" className="text-xs font-mono">{d.employeeCode}</Typography>
                  {isAdmin && canEdit ? (
                    <>
                      <MobileField label="Ngày đi làm">
                        <MobileTextInput type="number" min={0} step="0.1"
                          value={e.attendanceDays ?? ""}
                          onChange={(ev) => setEdit(d.id, "attendanceDays", ev.target.value)} />
                      </MobileField>
                      <MobileField label="Ngày công">
                        <MobileTextInput type="number" min={0} step="0.01"
                          value={e.workedDays ?? ""}
                          onChange={(ev) => setWorkedDaysEdit(d, ev.target.value)} />
                      </MobileField>
                      <MobileField label="Số giờ">
                        <HoursPartsInput
                          hoursH={e.hoursH}
                          hoursM={e.hoursM}
                          onChange={(h, m) => setHoursParts(d, h, m)}
                        />
                      </MobileField>
                      <MobileRow label="Mức lương"><RateDisplay d={d} /></MobileRow>
                      <MobileField label="Lương gộp (đ)">
                        <MoneyInput className="w-full rounded border border-blue-gray-200 px-2 py-1.5 text-sm text-right"
                          value={e.grossSalary ?? ""} onChange={(v) => setEdit(d.id, "grossSalary", v)} />
                      </MobileField>
                      <MobileField label="Thưởng (đ)">
                        <MoneyInput className="w-full rounded border border-blue-gray-200 px-2 py-1.5 text-sm text-right"
                          value={e.bonus ?? ""} onChange={(v) => setEdit(d.id, "bonus", v)} />
                      </MobileField>
                      <MobileField label="Phụ cấp (đ)">
                        <MoneyInput className="w-full rounded border border-blue-gray-200 px-2 py-1.5 text-sm text-right"
                          value={e.deliveryAllowance ?? ""} onChange={(v) => setEdit(d.id, "deliveryAllowance", v)} />
                      </MobileField>
                      <MobileField label="Khấu trừ (đ)">
                        <MoneyInput className="w-full rounded border border-blue-gray-200 px-2 py-1.5 text-sm text-right"
                          value={e.deduction ?? ""} onChange={(v) => setEdit(d.id, "deduction", v)} />
                      </MobileField>
                      <MobileField label="Ngân hàng">
                        <MobileTextInput value={e.bankName ?? ""} onChange={(ev) => setEdit(d.id, "bankName", ev.target.value)} />
                      </MobileField>
                      <MobileField label="Tên TK">
                        <MobileTextInput value={e.bankAccountName ?? ""} onChange={(ev) => setEdit(d.id, "bankAccountName", ev.target.value)} />
                      </MobileField>
                      <MobileField label="Số TK">
                        <MobileTextInput value={e.bankAccountNo ?? ""} onChange={(ev) => setEdit(d.id, "bankAccountNo", ev.target.value)} />
                      </MobileField>
                    </>
                  ) : (
                    <>
                      <MobileRow label="Ngày đi làm">
                        {displayAttendanceDays(d) != null
                          ? Number(displayAttendanceDays(d)).toLocaleString("en-US", { maximumFractionDigits: 1 })
                          : "— (tính lại)"}
                      </MobileRow>
                      <MobileRow label="Ngày công">{Number(displayCongDays(d)).toLocaleString("en-US", { maximumFractionDigits: 2 })}</MobileRow>
                      <MobileRow label="Lương gộp">{formatMoney(d.grossSalary)}</MobileRow>
                      <MobileRow label="Số giờ">{formatHoursMinutes(d.workedHours)}</MobileRow>
                      <MobileRow label="Mức lương"><RateDisplay d={d} /></MobileRow>
                    </>
                  )}
                  {canEdit && !isAdmin && (
                    <MobileField label="Phụ cấp (đ)">
                      <MoneyInput className="w-full rounded border border-blue-gray-200 px-2 py-1.5 text-sm text-right"
                        value={e.deliveryAllowance ?? ""} onChange={(v) => setEdit(d.id, "deliveryAllowance", v)} />
                    </MobileField>
                  )}
                  <MobileRow label="Ghi chú">
                    <button type="button" className="text-left text-blue-600 text-xs underline" onClick={() => openNoteModal(d)}>
                      {notePreview(e.note ?? d.note)}
                    </button>
                  </MobileRow>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Button size="sm" variant="outlined" className="normal-case"
                      onClick={() => setDayHistory({ detailId: d.id })}>
                      Lịch sử ngày làm
                    </Button>
                    {canEdit && (
                      <Button size="sm" className="normal-case" onClick={() => saveRow(d)} disabled={savingId === d.id}>
                        {savingId === d.id ? "Đang lưu..." : "Lưu"}
                      </Button>
                    )}
                  </div>
                  {!canEdit && Number(d.deliveryAllowance) > 0 && (
                    <MobileRow label="Phụ cấp">{formatMoney(d.deliveryAllowance)}</MobileRow>
                  )}
                  <MobileRow label="Thực nhận"><span className="font-bold">{formatMoney(net)}</span></MobileRow>
                  {(payroll.status === "Approved" || payroll.status === "Paid") && (
                    <MobileRow label="NV xác nhận">
                      <Chip size="sm" className="normal-case" color={confirmColors[d.employeeConfirmStatus] || "gray"}
                        value={confirmLabels[d.employeeConfirmStatus] || d.employeeConfirmStatus || "—"} />
                    </MobileRow>
                  )}
                  {!canEdit && (d.bankName || d.bankAccountNo) && (
                    <MobileRow label="Ngân hàng">
                      <span className="text-xs text-right">{formatBankLine(d)}</span>
                    </MobileRow>
                  )}
                </MobileCard>
              );
            })}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2.5 text-center w-10">STT</th>
                <th className="px-4 py-2.5 text-left cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("employeeName")}>Nhân viên <SortIcon active={sortKey === "employeeName"} dir={sortDir} /></th>
                <th className="px-4 py-2.5 text-center" title="Số ngày lịch có mặt (mỗi ngày đếm 1)">Ngày đi làm</th>
                <th className="px-4 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("workedDays")} title="Quy đổi giờ: đủ ~8h = 1 công (tối đa 1/ngày)">Ngày công <SortIcon active={sortKey === "workedDays"} dir={sortDir} /></th>
                <th className="px-4 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("workedHours")}>Số giờ <SortIcon active={sortKey === "workedHours"} dir={sortDir} /></th>
                <th className="px-4 py-2.5 text-right" title="Mức từ hồ sơ NV — không sửa trên bảng lương">
                  Mức lương
                </th>
                <th className="px-4 py-2.5 text-right cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("grossSalary")}>Lương gộp <SortIcon active={sortKey === "grossSalary"} dir={sortDir} /></th>
                <th className="px-4 py-2.5 text-right cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("bonus")}>Thưởng <SortIcon active={sortKey === "bonus"} dir={sortDir} /></th>
                <th className="px-4 py-2.5 text-right cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("deliveryAllowance")}>Phụ cấp <SortIcon active={sortKey === "deliveryAllowance"} dir={sortDir} /></th>
                <th className="px-4 py-2.5 text-left">Ghi chú</th>
                <th className="px-4 py-2.5 text-right cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("deduction")}>Khấu trừ <SortIcon active={sortKey === "deduction"} dir={sortDir} /></th>
                <th className="px-4 py-2.5 text-left">Tên ngân hàng</th>
                <th className="px-4 py-2.5 text-left">Tên TK</th>
                <th className="px-4 py-2.5 text-left">Số tài khoản</th>
                <th className="px-4 py-2.5 text-right font-bold cursor-pointer select-none hover:bg-blue-700" onClick={() => handleSort("netSalary")}>Thực nhận <SortIcon active={sortKey === "netSalary"} dir={sortDir} /></th>
                <th className="px-4 py-2.5 text-center">Chi tiết</th>
                {(payroll.status === "Approved" || payroll.status === "Paid") && (
                  <th className="px-4 py-2.5 text-center">NV xác nhận</th>
                )}
                {canEdit && <th className="px-4 py-2.5 text-center w-20">Lưu</th>}
              </tr>
            </thead>
            <tbody>
              {details.length === 0 ? (
                <tr><td colSpan={canEdit ? 18 : 17} className="py-10 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : sorted.map((d, i) => {
                const e = edits[d.id] || {};
                const net = calcNet({
                  ...d,
                  deliveryAllowance: parseEditMoney(e.deliveryAllowance, d.deliveryAllowance),
                  bonus: parseEditMoney(e.bonus, d.bonus),
                  deduction: parseEditMoney(e.deduction, d.deduction),
                  grossSalary: parseEditMoney(e.grossSalary, d.grossSalary),
                });
                return (
                  <tr key={d.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                    <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{d.employeeName} <span className="text-xs text-gray-400">({d.employeeCode})</span></td>
                    <td className="px-4 py-2.5 text-center text-blue-gray-700">
                      {isAdmin && canEdit ? (
                        <input type="number" min={0} step="0.1" className="w-14 text-center rounded border border-blue-gray-200 px-1 py-1 text-sm"
                          value={e.attendanceDays ?? ""} onChange={(ev) => setEdit(d.id, "attendanceDays", ev.target.value)} />
                      ) : displayAttendanceDays(d) != null
                        ? Number(displayAttendanceDays(d)).toLocaleString("en-US", { maximumFractionDigits: 1 })
                        : <span className="text-amber-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isAdmin && canEdit ? (
                        <input type="number" min={0} step="0.01" className="w-16 text-center rounded border border-blue-gray-200 px-1 py-1 text-sm"
                          value={e.workedDays ?? ""} onChange={(ev) => setWorkedDaysEdit(d, ev.target.value)} />
                      ) : Number(displayCongDays(d)).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      {isAdmin && canEdit ? (
                        <HoursPartsInput
                          hoursH={e.hoursH}
                          hoursM={e.hoursM}
                          onChange={(h, m) => setHoursParts(d, h, m)}
                        />
                      ) : formatHoursMinutes(d.workedHours)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <RateDisplay d={d} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin && canEdit ? (
                        <MoneyInput className="w-28 text-right rounded border border-blue-gray-200 px-2 py-1 text-sm"
                          value={e.grossSalary ?? ""} onChange={(v) => setEdit(d.id, "grossSalary", v)} />
                      ) : formatAmount(d.grossSalary)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin && canEdit ? (
                        <MoneyInput className="w-24 text-right rounded border border-blue-gray-200 px-2 py-1 text-sm text-green-700"
                          value={e.bonus ?? ""} onChange={(v) => setEdit(d.id, "bonus", v)} />
                      ) : (
                        <span className="text-green-600">{d.bonus > 0 ? `+${formatAmount(d.bonus)}` : "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {canEdit ? (
                        <MoneyInput className="w-28 text-right rounded border border-blue-gray-200 px-2 py-1 text-sm"
                          value={e.deliveryAllowance ?? ""} onChange={(v) => setEdit(d.id, "deliveryAllowance", v)} />
                      ) : (
                        <span className="text-amber-600">{d.deliveryAllowance > 0 ? `+${formatAmount(d.deliveryAllowance)}` : "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[160px]">
                      <button
                        type="button"
                        title={e.note || d.note || "Xem ghi chú"}
                        onClick={() => openNoteModal(d)}
                        className="text-left text-xs text-blue-700 hover:underline w-full truncate"
                      >
                        {notePreview(e.note ?? d.note)}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin && canEdit ? (
                        <MoneyInput className="w-24 text-right rounded border border-blue-gray-200 px-2 py-1 text-sm text-red-600"
                          value={e.deduction ?? ""} onChange={(v) => setEdit(d.id, "deduction", v)} />
                      ) : (
                        <span className="text-red-500">{d.deduction > 0 ? `-${formatAmount(d.deduction)}` : "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-blue-gray-700 whitespace-nowrap max-w-[140px]">
                      {isAdmin && canEdit ? (
                        <input type="text" className="w-full min-w-[100px] rounded border border-blue-gray-200 px-1 py-1 text-xs uppercase"
                          value={e.bankName ?? ""} onChange={(ev) => setEdit(d.id, "bankName", ev.target.value)} />
                      ) : (
                        <span className="truncate block" title={d.bankName || ""}>{d.bankName || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-blue-gray-700 whitespace-nowrap max-w-[140px]">
                      {isAdmin && canEdit ? (
                        <input type="text" className="w-full min-w-[100px] rounded border border-blue-gray-200 px-1 py-1 text-xs uppercase"
                          value={e.bankAccountName ?? ""} onChange={(ev) => setEdit(d.id, "bankAccountName", ev.target.value)} />
                      ) : (
                        <span className="truncate block" title={d.bankAccountName || ""}>{d.bankAccountName || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-blue-gray-800 whitespace-nowrap">
                      {isAdmin && canEdit ? (
                        <input type="text" className="w-full min-w-[100px] rounded border border-blue-gray-200 px-1 py-1 text-xs font-mono"
                          value={e.bankAccountNo ?? ""} onChange={(ev) => setEdit(d.id, "bankAccountNo", ev.target.value)} />
                      ) : (d.bankAccountNo || "—")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-blue-gray-800">{formatMoney(net)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setDayHistory({ detailId: d.id })}
                        className="text-xs text-blue-600 hover:underline"
                        title="Xem vào/ra, công, tiền từng ngày"
                      >
                        Xem
                      </button>
                    </td>
                    {(payroll.status === "Approved" || payroll.status === "Paid") && (
                      <td className="px-4 py-2.5 text-center">
                        <Chip size="sm" className="normal-case mx-auto w-fit" color={confirmColors[d.employeeConfirmStatus] || "gray"}
                          value={confirmLabels[d.employeeConfirmStatus] || d.employeeConfirmStatus || "—"} />
                      </td>
                    )}
                    {canEdit && (
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={() => saveRow(d)} disabled={savingId === d.id}
                          className="text-xs text-blue-600 hover:underline disabled:text-gray-400">
                          {savingId === d.id ? "..." : "Lưu"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {details.length > 0 && (
            <div className="hidden md:flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 border-t bg-blue-gray-50 text-sm font-semibold text-blue-gray-900">
              <span>TỔNG ({detailTotals.count} NV)</span>
              <span>Giờ: <span className="text-blue-800">{formatHoursMinutes(detailTotals.hours)}</span></span>
              <span>Công: <span className="text-blue-800">{Number(detailTotals.cong).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span></span>
              {detailTotals.att > 0 && (
                <span>Ngày đi làm: <span className="text-blue-800">{Number(detailTotals.att).toLocaleString("en-US", { maximumFractionDigits: 1 })}</span></span>
              )}
              <span className="ml-auto">Tiền: <span className="text-blue-900">{formatMoney(totalAmount)}</span></span>
            </div>
          )}
        </CardBody>
      </Card>

      {showLogs && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setShowLogs(false)} aria-label="Đóng" />
          <div className="relative bg-white w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col">
            <div className="p-4 border-b">
              <Typography variant="h6" color="blue-gray">Log chỉnh sửa</Typography>
              <Typography variant="small" color="gray">
                {payroll.storeName} — T.{payroll.month}/{payroll.year}
              </Typography>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {logsLoading ? (
                <p className="text-sm text-gray-400 text-center py-8">Đang tải...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Chưa có log.</p>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="rounded-lg border border-blue-gray-100 px-3 py-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold text-blue-gray-800">{actionLabel(l.action)}</span>
                      <span className="text-xs text-blue-gray-500">{formatPayrollDateTime(l.createdAt)}</span>
                    </div>
                    {(l.fromStatus || l.toStatus) && (
                      <p className="text-xs text-blue-gray-600 mt-0.5">
                        {statusLabels[l.fromStatus] || l.fromStatus || "—"} → {statusLabels[l.toStatus] || l.toStatus || "—"}
                      </p>
                    )}
                    {l.message && <p className="text-xs text-blue-gray-700 mt-1">{l.message}</p>}
                    <p className="text-xs text-blue-gray-500 mt-1">Bởi {l.changedByName || "—"}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t flex justify-end">
              <Button size="sm" variant="outlined" onClick={() => setShowLogs(false)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {noteModal && (() => {
        const e = edits[noteModal.detailId] || {};
        const parts = noteParts(e.note);
        return (
          <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setNoteModal(null)} aria-label="Đóng" />
            <div className="relative bg-white w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col">
              <div className="p-4 border-b">
                <Typography variant="h6" color="blue-gray">Ghi chú / các khoản</Typography>
                <Typography variant="small" color="gray">{noteModal.name}</Typography>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {noteModal.canEdit ? (
                  <textarea
                    rows={8}
                    className="w-full rounded-lg border border-blue-gray-200 px-3 py-2 text-sm"
                    placeholder={"Mỗi khoản một dòng hoặc cách bằng dấu ;\nVD:\nThưởng sinh nhật 300,000 (15/07)\nPhụ cấp giao hàng 5 chuyến"}
                    value={e.note ?? ""}
                    onChange={(ev) => setEdit(noteModal.detailId, "note", ev.target.value)}
                  />
                ) : null}
                {parts.length > 0 ? (
                  <ul className="space-y-2">
                    {parts.map((p, idx) => (
                      <li key={idx} className="rounded-lg border border-blue-gray-100 bg-blue-gray-50/60 px-3 py-2 text-sm text-blue-gray-800">
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  !noteModal.canEdit && <p className="text-sm text-gray-400 text-center py-6">Không có ghi chú.</p>
                )}
                {noteModal.canEdit && (
                  <p className="text-[11px] text-blue-gray-500">Các dòng tách theo xuống dòng hoặc dấu ; — bấm Lưu ghi chú để ghi vào bảng lương.</p>
                )}
              </div>
              <div className="p-3 border-t flex justify-end gap-2">
                {noteModal.canEdit && (
                  <Button
                    size="sm"
                    color="blue"
                    className="normal-case"
                    disabled={savingId === noteModal.detailId}
                    onClick={async () => {
                      const row = details.find((x) => x.id === noteModal.detailId);
                      if (row) await saveRow(row);
                      setNoteModal(null);
                    }}
                  >
                    Lưu ghi chú
                  </Button>
                )}
                <Button size="sm" variant="outlined" onClick={() => setNoteModal(null)}>Đóng</Button>
              </div>
            </div>
          </div>
        );
      })()}

      <PayrollDailyHistoryModal
        open={!!dayHistory}
        payrollId={id}
        detailId={dayHistory?.detailId}
        onClose={() => setDayHistory(null)}
      />
    </div>
  );
}
