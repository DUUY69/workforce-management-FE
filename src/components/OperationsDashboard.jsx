import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/solid";
import api from "@/api";
import { fetchStores } from "@/utils/storesApi";
import { formatMoney } from "@/utils/formatMoney";
import { formatDateVi } from "@/utils/dates";
import { useAuth } from "@/context/AuthContext";
import {
  TrendLineChart,
  CostComboChart,
  ScoreGauge,
  StoreHoursBarChart,
} from "@/components/DashboardCharts";

function localTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dashUrl(path, params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "" && v !== false) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

function kpiPct(part, total) {
  const t = Number(total || 0);
  if (t <= 0) return null;
  return `${Math.round((Number(part || 0) / t) * 1000) / 10}%`;
}

function KpiCard({ icon, label, value, sub, color = "blue", onClick }) {
  const bg = { blue: "bg-blue-50", green: "bg-green-50", amber: "bg-amber-50", red: "bg-red-50", purple: "bg-purple-50" };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-lg border border-blue-gray-100 bg-white px-2 py-1.5 flex items-center gap-1.5 min-w-0 ${
        onClick ? "cursor-pointer hover:border-blue-300 hover:shadow-sm text-left w-full" : ""
      }`}
    >
      <div className={`p-1 rounded-md shrink-0 ${bg[color]}`}>{icon}</div>
      <div className="min-w-0 leading-tight">
        <p className="text-[9px] text-blue-gray-500 truncate">{label}</p>
        <p className="text-sm font-bold text-blue-gray-900 truncate">{value}</p>
        {sub && <p className="text-[8px] text-blue-gray-400 truncate">{sub}</p>}
      </div>
    </Tag>
  );
}

function Panel({ title, actionLabel, onAction, children, className = "", bodyClass = "p-2", id }) {
  return (
    <div id={id} className={`rounded-lg border border-blue-gray-100 bg-white ${className}`}>
      {title && (
        <div className="px-2 pt-2 pb-1 border-b border-blue-gray-50 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-blue-gray-800 truncate">{title}</p>
          {actionLabel && onAction && (
            <button type="button" onClick={onAction}
              className="text-[9px] text-blue-600 font-medium hover:underline shrink-0 whitespace-nowrap">
              {actionLabel}
            </button>
          )}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

function ClickCell({ children, onClick, className = "", title }) {
  if (!onClick || children === 0 || children === "0" || children === "0.0") {
    return <td className={className}>{children}</td>;
  }
  return (
    <td className={className}>
      <button
        type="button"
        onClick={onClick}
        title={title}
        className="w-full py-0.5 rounded hover:bg-blue-50 hover:text-blue-700 text-inherit"
      >
        {children}
      </button>
    </td>
  );
}

function shortStoreName(name) {
  const s = String(name || "");
  if (s.length <= 28) return s;
  const parts = s.split("-");
  if (parts.length > 1) return `${parts[0].trim()} - ${parts[parts.length - 1].trim().slice(0, 18)}`;
  return `${s.slice(0, 26)}…`;
}

function AlertLevel({ level }) {
  const cls = {
    ok: "bg-green-500",
    info: "bg-blue-500",
    warning: "bg-amber-500",
    problem: "bg-red-500",
  };
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 mt-1 ${cls[level] || "bg-gray-400"}`} />;
}

export default function OperationsDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [workDate, setWorkDate] = useState(localTodayStr());
  /** day = vận hành realtime; month = tổng hợp giờ/lương theo tháng (Admin ưu tiên). */
  const [viewMode, setViewMode] = useState("day");
  const [monthVal, setMonthVal] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [storeId, setStoreId] = useState("");
  const [storeQuery, setStoreQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [area, setArea] = useState("");
  const [stores, setStores] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingShifts, setPendingShifts] = useState(0);
  const [headcount, setHeadcount] = useState({ employees: 0, stores: 0 });
  const [laborRows, setLaborRows] = useState([]);
  const [laborLoading, setLaborLoading] = useState(false);
  const [laborSortKey, setLaborSortKey] = useState("storeName");
  const [laborSortDir, setLaborSortDir] = useState("asc");

  useEffect(() => {
    fetchStores(api, { isAdmin }).then(setStores).catch(() => setStores([]));
    if (isAdmin) {
      api.get("/employees?isActive=true")
        .then((r) => setHeadcount((h) => ({ ...h, employees: r.data.data?.length || 0 })))
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    setHeadcount((h) => ({ ...h, stores: stores.length }));
  }, [stores.length]);

  const laborYear = viewMode === "month"
    ? Number(monthVal.slice(0, 4))
    : Number(workDate.slice(0, 4));
  const laborMonth = viewMode === "month"
    ? Number(monthVal.slice(5, 7))
    : Number(workDate.slice(5, 7));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Luôn nạp operations theo workDate để giữ charts 7 ngày kể cả khi xem Tháng
        const params = new URLSearchParams({ workDate });
        if (storeId) params.set("storeId", storeId);
        const res = await api.get(`/dashboard/operations?${params}`);
        setData(res.data.data || null);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workDate, storeId]);

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams({ status: "Pending", dateFrom: workDate, dateTo: workDate });
    if (storeId) params.set("storeId", storeId);
    api.get(`/shift-registrations?${params}`)
      .then((r) => setPendingShifts(r.data.data?.length || 0))
      .catch(() => setPendingShifts(0));
  }, [data, workDate, storeId]);

  useEffect(() => {
    if (!laborYear || !laborMonth) return;
    setLaborLoading(true);
    const params = new URLSearchParams({ year: String(laborYear), month: String(laborMonth) });
    if (storeId) params.set("storeId", storeId);
    api.get(`/reports/employee-labor?${params}`)
      .then((r) => setLaborRows(r.data.data || []))
      .catch(() => setLaborRows([]))
      .finally(() => setLaborLoading(false));
  }, [laborYear, laborMonth, storeId]);

  const monthStoreRollup = useMemo(() => {
    const map = new Map();
    for (const r of laborRows) {
      const key = String(r.storeId);
      if (!map.has(key)) {
        map.set(key, {
          storeId: r.storeId,
          storeName: r.storeName,
          empCount: 0,
          workedHours: 0,
          workedDays: 0,
          estimatedPay: 0,
        });
      }
      const row = map.get(key);
      row.empCount += 1;
      row.workedHours += Number(r.workedHours || 0);
      row.workedDays += Number(r.workedDays || 0);
      row.estimatedPay += Number(r.estimatedPay || 0);
    }
    return Array.from(map.values()).sort((a, b) => b.estimatedPay - a.estimatedPay);
  }, [laborRows]);

  const laborSorted = useMemo(() => {
    if (!laborRows.length) return [];
    const dir = laborSortDir === "asc" ? 1 : -1;
    return [...laborRows].sort((a, b) => {
      const va = a[laborSortKey];
      const vb = b[laborSortKey];
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va ?? "").localeCompare(String(vb ?? ""), "vi") * dir;
    });
  }, [laborRows, laborSortKey, laborSortDir]);

  const toggleLaborSort = (key) => {
    if (laborSortKey === key) setLaborSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setLaborSortKey(key);
      setLaborSortDir(key === "estimatedPay" || key === "workedHours" ? "desc" : "asc");
    }
  };

  const goAttendance = (opts = {}) => {
    navigate(dashUrl("/dashboard/attendance", {
      date: opts.date || workDate,
      storeId: opts.storeId || storeId || "",
      flaggedOnly: opts.flaggedOnly ? "1" : "",
      viewMonth: opts.viewMonth ? "1" : "",
    }));
  };

  const goShifts = (opts = {}) => {
    navigate(dashUrl("/dashboard/shift-registrations", {
      storeId: opts.storeId || storeId || "",
      status: opts.status || "",
      viewMode: "day",
      dayView: opts.date || workDate,
    }));
  };

  const focusStore = (id) => {
    if (!id) return;
    const picked = stores.find((s) => String(s.id) === String(id));
    setStoreId(String(id));
    setStoreQuery(picked ? `${picked.name} (${picked.id})` : "");
    // Cuộn tới bảng NV / giờ / lương của CH
    setTimeout(() => {
      document.getElementById("dash-store-labor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const laborTotals = useMemo(() => {
    const hours = laborRows.reduce((s, r) => s + Number(r.workedHours || 0), 0);
    const pay = laborRows.reduce((s, r) => s + Number(r.estimatedPay || 0), 0);
    const cong = laborRows.reduce((s, r) => s + Number(r.workedDays || 0), 0);
    return { hours, ot: 0, pay, cong, count: laborRows.length };
  }, [laborRows]);

  /** Nhóm theo CH + dòng tổng từng CH (khi xem tất cả). */
  const laborGroupedRows = useMemo(() => {
    if (!laborSorted.length) return [];
    if (storeId) {
      return laborSorted.map((r) => ({ kind: "emp", row: r }));
    }
    const byStore = new Map();
    for (const r of laborSorted) {
      const key = String(r.storeId);
      if (!byStore.has(key)) byStore.set(key, []);
      byStore.get(key).push(r);
    }
    const out = [];
    for (const [, rows] of byStore) {
      const storeName = rows[0].storeName;
      const storeIdNum = rows[0].storeId;
      out.push({
        kind: "storeTotal",
        storeId: storeIdNum,
        storeName,
        empCount: rows.length,
        workedHours: rows.reduce((s, r) => s + Number(r.workedHours || 0), 0),
        workedDays: rows.reduce((s, r) => s + Number(r.workedDays || 0), 0),
        estimatedPay: rows.reduce((s, r) => s + Number(r.estimatedPay || 0), 0),
      });
      for (const r of rows) out.push({ kind: "emp", row: r });
    }
    return out;
  }, [laborSorted, storeId]);

  const formatRateLabel = (r) => {
    if (r.salaryType === "Monthly") {
      return `${Number(r.baseRate).toLocaleString("en-US")}đ/tháng · ${Number(r.workedDays).toFixed(2)} công`;
    }
    return `${Number(r.baseRate).toLocaleString("en-US")}đ/giờ`;
  };

  const resolveStoreId = (name, id) => {
    if (id) return String(id);
    if (!name) return "";
    const exact = stores.find((s) => s.name === name);
    if (exact) return String(exact.id);
    const partial = stores.find((s) => name.includes(s.name) || s.name.includes(name));
    return partial ? String(partial.id) : "";
  };

  const handleAlertClick = (alert) => {
    const sid = resolveStoreId(alert.storeName, alert.storeId);
    const action = alert.action
      || (alert.message?.includes("chưa check-in") ? "missing_checkin" : null)
      || (alert.message?.includes("chờ QL") ? "pending_review" : null)
      || (alert.message?.includes("cờ cảnh báo") ? "flagged" : null)
      || (alert.message?.includes("quên checkout") ? "forgot_checkout" : null)
      || (alert.message?.includes("Thiếu nhân sự") ? "understaffed" : null);
    switch (action) {
      case "missing_checkin":
        goAttendance({ storeId: sid });
        break;
      case "pending_review":
        goAttendance({ storeId: sid });
        break;
      case "flagged":
        goAttendance({ storeId: sid, flaggedOnly: true });
        break;
      case "forgot_checkout":
        goAttendance({ storeId: sid });
        break;
      case "understaffed":
        goShifts({ storeId: sid, status: "Pending" });
        break;
      default:
        if (sid) focusStore(sid);
        else goAttendance();
    }
  };

  const kpi = data?.kpi || {};
  const labor = data?.labor || {};
  const score = data?.storeScore;
  const storeStatusRaw = data?.storeStatus || [];
  const storeMetaById = useMemo(() => {
    const map = new Map();
    for (const s of stores) {
      const name = String(s?.name || "");
      const address = String(s?.address || "");
      const brandName = String(s?.brand || "").trim() || (name.split("-")[0] || "").trim() || "Khác";
      const areaName = String(s?.area || "").trim() || (address.split(",").pop() || "Khác").trim() || "Khác";
      map.set(Number(s.id), { brandName, areaName });
    }
    return map;
  }, [stores]);
  const brandOptions = useMemo(
    () => Array.from(new Set(stores.map((s) => (String(s?.brand || "").trim() || (String(s?.name || "").split("-")[0] || "").trim() || "Khác")))).sort(),
    [stores]
  );
  const areaOptions = useMemo(
    () => Array.from(new Set(stores.map((s) => (String(s?.area || "").trim() || (String(s?.address || "").split(",").pop() || "Khác").trim() || "Khác")))).sort(),
    [stores]
  );
  const storeStatus = useMemo(
    () =>
      storeStatusRaw.filter((row) => {
        const meta = storeMetaById.get(Number(row.storeId));
        if (brand && meta?.brandName !== brand) return false;
        if (area && meta?.areaName !== area) return false;
        return true;
      }),
    [storeStatusRaw, storeMetaById, brand, area]
  );
  const missingCheckInCount = data?.missingCheckIn?.length || 0;
  const understaffedShiftCount = Math.max(0, Number(labor.requiredStaff || 0) - Number(labor.approvedStaff || 0));
  const understaffedStoreCount = storeStatus.filter((s) => Number(s.missing || 0) > 0).length;
  const topHours = useMemo(
    () => [...storeStatus]
      .map((s) => ({
        storeId: s.storeId,
        name: s.storeName,
        // Bug cũ: dùng checkedIn (số người) + OT coi như giờ → sai hoàn toàn.
        hours: Number(s.workedHours ?? 0),
      }))
      .filter((s) => s.hours > 0)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6),
    [storeStatus]
  );
  const last7 = data?.last7Days || [];
  const scheduled = Number(kpi.totalScheduled || 0);
  const costVariance = labor.estimatedPay > 0
    ? Math.round(((Number(labor.confirmedPay || 0) - Number(labor.estimatedPay || 0)) / Number(labor.estimatedPay)) * 1000) / 10
    : 0;
  const alertCounts = useMemo(() => {
    const alerts = data?.alerts || [];
    const pick = (action) => {
      const a = alerts.find((x) => x.action === action);
      if (!a) return 0;
      const m = String(a.message || "").match(/^(\d+)/);
      return m ? Number(m[1]) : 0;
    };
    return {
      pendingReview: pick("pending_review"),
      flagged: pick("flagged"),
      missingCheckIn: pick("missing_checkin"),
      understaffed: alerts.filter((x) => x.action === "understaffed").length,
    };
  }, [data?.alerts]);
  const quickActions = [
    { label: "Duyệt công", path: "/dashboard/attendance", badge: alertCounts.pendingReview || missingCheckInCount, onClick: () => goAttendance() },
    { label: "Phân ca", path: "/dashboard/shift-registrations", badge: pendingShifts, onClick: () => goShifts({ status: "Pending" }) },
    { label: "Cảnh báo giờ", path: "/dashboard/attendance", badge: alertCounts.flagged, onClick: () => goAttendance({ flaggedOnly: true }) },
    { label: "CH thiếu người", path: "/dashboard/shift-registrations", badge: understaffedStoreCount, onClick: () => goShifts({ status: "Pending" }) },
  ];
  const filterableStores = useMemo(
    () =>
      stores.filter((s) => {
        const meta = storeMetaById.get(Number(s.id));
        if (brand && meta?.brandName !== brand) return false;
        if (area && meta?.areaName !== area) return false;
        return true;
      }),
    [stores, storeMetaById, brand, area]
  );
  const storeSearchOptions = useMemo(() => {
    const q = storeQuery.trim().toLowerCase();
    if (!q) return filterableStores.slice(0, 30);
    return filterableStores
      .filter((s) => {
        const meta = storeMetaById.get(Number(s.id));
        const text = `${s.name} ${s.address || ""} ${meta?.brandName || ""} ${meta?.areaName || ""}`.toLowerCase();
        return text.includes(q);
      })
      .slice(0, 30);
  }, [filterableStores, storeMetaById, storeQuery]);

  useEffect(() => {
    if (!storeId) {
      setStoreQuery("");
      return;
    }
    const selected = stores.find((s) => String(s.id) === String(storeId));
    setStoreQuery(selected ? `${selected.name} (${selected.id})` : "");
  }, [storeId, stores]);

  const handleStoreQueryChange = (value) => {
    setStoreQuery(value);
    if (!value.trim()) {
      setStoreId("");
      return;
    }
    const idMatch = value.match(/\((\d+)\)\s*$/);
    if (idMatch) {
      const pickedId = idMatch[1];
      if (stores.some((s) => String(s.id) === pickedId)) {
        setStoreId(pickedId);
      }
    }
  };


  const monthLabel = `T.${laborMonth}/${laborYear}`;
  const isMonth = viewMode === "month";
  const filteredMonthStores = useMemo(
    () =>
      monthStoreRollup.filter((row) => {
        const meta = storeMetaById.get(Number(row.storeId));
        if (brand && meta?.brandName !== brand) return false;
        if (area && meta?.areaName !== area) return false;
        return true;
      }),
    [monthStoreRollup, storeMetaById, brand, area]
  );
  const topMonthHours = useMemo(
    () =>
      filteredMonthStores
        .map((s) => ({ storeId: s.storeId, name: s.storeName, hours: s.workedHours }))
        .filter((s) => s.hours > 0)
        .slice(0, 6),
    [filteredMonthStores]
  );
  const topMonthPayEmployees = useMemo(
    () => [...laborSorted].sort((a, b) => Number(b.estimatedPay) - Number(a.estimatedPay)).slice(0, 6),
    [laborSorted]
  );
  const topMonthHourEmployees = useMemo(
    () => [...laborSorted].sort((a, b) => Number(b.workedHours) - Number(a.workedHours)).slice(0, 6),
    [laborSorted]
  );
  const monthPayShare = useMemo(() => {
    const monthly = laborRows.filter((r) => r.salaryType === "Monthly").length;
    const hourly = laborRows.length - monthly;
    return { monthly, hourly };
  }, [laborRows]);
  const avgCong = laborTotals.count > 0 ? laborTotals.cong / laborTotals.count : 0;
  const congProgress = Math.min(100, Math.round((avgCong / 26) * 100));

  if (viewMode === "day" && loading && !data) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm space-y-2">
        <p>Đang tải dashboard...</p>
        <p className="text-xs text-gray-400">Đang tổng hợp dữ liệu — thường 3–8 giây.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-blue-gray-800">
      {/* Header + filter 1 dòng */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-bold text-blue-gray-900">
          {viewMode === "month" ? `Tổng hợp tháng · ${monthLabel}` : `Vận hành · ${formatDateVi(workDate)}`}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded border border-blue-gray-200 overflow-hidden text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-2 py-1 font-medium ${viewMode === "day" ? "bg-blue-600 text-white" : "bg-white text-blue-gray-700 hover:bg-blue-50"}`}
            >
              Ngày
            </button>
            <button
              type="button"
              onClick={() => {
                setMonthVal(workDate.slice(0, 7));
                setViewMode("month");
              }}
              className={`px-2 py-1 font-medium ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-white text-blue-gray-700 hover:bg-blue-50"}`}
            >
              Tháng
            </button>
          </div>
          {viewMode === "day" ? (
            <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)}
              className="rounded border border-blue-gray-200 px-1.5 py-1 text-[11px]" />
          ) : (
            <input type="month" value={monthVal} onChange={(e) => setMonthVal(e.target.value)}
              className="rounded border border-blue-gray-200 px-1.5 py-1 text-[11px]" />
          )}
          <select value={brand} onChange={(e) => setBrand(e.target.value)}
            className="rounded border border-blue-gray-200 px-1.5 py-1 text-[11px] bg-white max-w-[130px]">
            <option value="">Thương hiệu</option>
            {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={area} onChange={(e) => setArea(e.target.value)}
            className="rounded border border-blue-gray-200 px-1.5 py-1 text-[11px] bg-white max-w-[120px]">
            <option value="">Khu vực</option>
            {areaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {(isAdmin || stores.length > 1) && (
            <>
              <input
                type="text"
                list="store-filter-options"
                value={storeQuery}
                onChange={(e) => handleStoreQueryChange(e.target.value)}
                placeholder="Tìm CH..."
                className="rounded border border-blue-gray-200 px-1.5 py-1 text-[11px] bg-white w-[140px]"
              />
              <datalist id="store-filter-options">
                {storeSearchOptions.map((s) => (
                  <option key={s.id} value={`${s.name} (${s.id})`} />
                ))}
              </datalist>
              {storeId && (
                <button type="button" onClick={() => { setStoreId(""); setStoreQuery(""); }}
                  className="text-[10px] text-blue-600">✕</button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => {
              if (viewMode === "month") {
                navigate(dashUrl("/dashboard/reports", { month: String(laborMonth), year: String(laborYear), storeId: storeId || "" }));
              } else {
                navigate(`/dashboard/attendance?date=${workDate}`);
              }
            }}
            className="text-[10px] text-blue-600 font-medium hover:underline whitespace-nowrap"
          >
            {viewMode === "month" ? "Báo cáo →" : "Chi tiết →"}
          </button>
        </div>
      </div>

      {isMonth && storeId && !laborLoading && laborTotals.count === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-900 flex flex-wrap items-center gap-2">
          <span>CH đang lọc chưa có công confirm trong {monthLabel}.</span>
          <button type="button" className="font-semibold text-blue-700 hover:underline"
            onClick={() => { setStoreId(""); setStoreQuery(""); }}>
            Xóa lọc CH → xem tất cả
          </button>
        </div>
      )}

      {/* KPI — cùng khung 8 ô; Tháng đổi chỉ số tổng hợp */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {isMonth ? (
          <>
            <KpiCard icon={<UserGroupIcon className="w-3.5 h-3.5 text-blue-600" />} label="NV có công" value={laborTotals.count} color="blue"
              onClick={() => document.getElementById("dash-store-labor")?.scrollIntoView({ behavior: "smooth" })} />
            <KpiCard icon={<BuildingStorefrontIcon className="w-3.5 h-3.5 text-indigo-600" />} label="CH có công" value={filteredMonthStores.length} color="blue"
              onClick={() => document.getElementById("dash-store-status")?.scrollIntoView({ behavior: "smooth" })} />
            <KpiCard icon={<ClockIcon className="w-3.5 h-3.5 text-green-600" />} label="Tổng giờ" value={`${laborTotals.hours.toFixed(1)}h`} color="green" />
            <KpiCard icon={<CalendarDaysIcon className="w-3.5 h-3.5 text-amber-600" />} label="Tổng công" value={laborTotals.cong.toFixed(1)} color="amber"
              sub={`TB ${avgCong.toFixed(1)}/26`} />
            <KpiCard icon={<CheckCircleIcon className="w-3.5 h-3.5 text-indigo-600" />} label="Theo tháng" value={monthPayShare.monthly} color="blue"
              sub={`${monthPayShare.hourly} theo giờ`} />
            <KpiCard icon={<ChartBarIcon className="w-3.5 h-3.5 text-green-600" />} label="% công TB" value={`${congProgress}%`} color="green"
              sub="so với 26 công" />
            <KpiCard icon={<UserGroupIcon className="w-3.5 h-3.5 text-teal-600" />} label="Giờ/NV" value={laborTotals.count ? `${(laborTotals.hours / laborTotals.count).toFixed(1)}h` : "0h"} color="green" />
            <KpiCard icon={<BanknotesIcon className="w-3.5 h-3.5 text-purple-600" />} label="Cần trả" value={formatMoney(laborTotals.pay)} color="purple"
              sub="theo công confirm"
              onClick={() => navigate(dashUrl("/dashboard/reports", { month: String(laborMonth), year: String(laborYear) }))} />
          </>
        ) : (
          <>
            <KpiCard icon={<UserGroupIcon className="w-3.5 h-3.5 text-blue-600" />} label="NV ca" value={kpi.totalScheduled ?? 0} color="blue"
              onClick={() => goShifts({ status: "Approved" })} />
            <KpiCard icon={<CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />} label="Check-in" value={kpi.checkedIn ?? 0}
              sub={kpiPct(kpi.checkedIn, scheduled)} color="green" onClick={() => goAttendance()} />
            <KpiCard icon={<ClockIcon className="w-3.5 h-3.5 text-red-600" />} label="Chưa vào" value={missingCheckInCount}
              sub={kpiPct(missingCheckInCount, scheduled)} color="red" onClick={() => goAttendance()} />
            <KpiCard icon={<ClockIcon className="w-3.5 h-3.5 text-amber-600" />} label="Trễ" value={kpi.late ?? 0}
              sub={kpiPct(kpi.late, scheduled)} color="amber" onClick={() => goAttendance()} />
            <KpiCard icon={<CalendarDaysIcon className="w-3.5 h-3.5 text-red-600" />} label="Vắng" value={kpi.onLeave ?? 0}
              sub={kpiPct(kpi.onLeave, scheduled)} color="red" onClick={() => goAttendance()} />
            <KpiCard icon={<ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600" />} label="Ca thiếu" value={understaffedShiftCount} color="amber"
              onClick={() => goShifts({ status: "Pending" })} />
            <KpiCard icon={<ChartBarIcon className="w-3.5 h-3.5 text-red-600" />} label="CH thiếu" value={understaffedStoreCount} color="red"
              onClick={() => goShifts({ status: "Pending" })} />
            <KpiCard icon={<BanknotesIcon className="w-3.5 h-3.5 text-green-600" />} label="Cần trả" value={formatMoney(labor.confirmedPay ?? 0)} color="green"
              sub={`DK ca ${formatMoney(kpi.todayLaborCost ?? 0)}`}
              onClick={() => navigate("/dashboard/reports")} />
          </>
        )}
      </div>

      {/* Hàng 2: Bảng CH + Chi phí/Gauge/Cảnh báo — cùng layout Ngày & Tháng */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">
        <Panel
          id="dash-store-status"
          title={isMonth
            ? `Tình trạng nhân sự theo cửa hàng · ${monthLabel} (${filteredMonthStores.length})`
            : `Tình trạng nhân sự theo cửa hàng (${storeStatus.length})`}
          actionLabel={isMonth ? "Bảng NV ↓" : "Xem chi tiết →"}
          onAction={() => (isMonth
            ? document.getElementById("dash-store-labor")?.scrollIntoView({ behavior: "smooth" })
            : goAttendance())}
          className="xl:col-span-7"
          bodyClass="p-0"
        >
          {isMonth ? (
            laborLoading ? (
              <p className="text-[11px] text-gray-400 p-2">Đang tải...</p>
            ) : filteredMonthStores.length === 0 ? (
              <p className="text-[11px] text-gray-400 p-2">Chưa có công confirm trong tháng này.</p>
            ) : (
              <div className="overflow-auto max-h-[150px]">
                <table className="w-full text-[10px]">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-blue-gray-500 border-b border-blue-gray-100">
                      <th className="py-1 px-2 text-left font-semibold">Cửa hàng</th>
                      <th className="py-1 px-1 text-right font-semibold" title="Số tiền cần trả theo công đã confirm">Cần trả</th>
                      <th className="py-1 px-1 text-center">NV</th>
                      <th className="py-1 px-1 text-center">Công</th>
                      <th className="py-1 px-1 text-center">Giờ</th>
                      <th className="py-1 px-2 text-center">TB công</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonthStores.map((row) => {
                      const sid = String(row.storeId);
                      const avg = row.empCount > 0 ? row.workedDays / row.empCount : 0;
                      return (
                        <tr key={row.storeId} className="border-b border-blue-gray-50 hover:bg-blue-gray-50/50">
                          <td className="py-0.5 px-2 font-medium max-w-[140px]">
                            <button type="button" onClick={() => focusStore(sid)}
                              className="truncate max-w-full text-left hover:text-blue-700 hover:underline font-semibold">
                              {shortStoreName(row.storeName)}
                            </button>
                          </td>
                          <td className="py-0.5 px-1 text-right font-semibold text-purple-800 whitespace-nowrap">
                            {row.estimatedPay.toLocaleString("en-US")} đ
                          </td>
                          <td className="py-0.5 px-1 text-center">{row.empCount}</td>
                          <td className="py-0.5 px-1 text-center">{row.workedDays.toFixed(1)}</td>
                          <td className="py-0.5 px-1 text-center">{row.workedHours.toFixed(1)}</td>
                          <td className="py-0.5 px-2 text-center">
                            <span className={`inline-block min-w-[26px] rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ${
                              avg >= 20 ? "bg-green-500" : avg >= 12 ? "bg-amber-500" : "bg-red-500"
                            }`}>{avg.toFixed(0)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : storeStatus.length === 0 ? (
            <p className="text-[11px] text-gray-400 p-2">Không có dữ liệu.</p>
          ) : (
            <div className="overflow-auto max-h-[150px]">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-blue-gray-500 border-b border-blue-gray-100">
                    <th className="py-1 px-2 text-left font-semibold">Cửa hàng</th>
                    <th className="py-1 px-1 text-right font-semibold" title="Số tiền cần trả = công đã confirm. DK = theo ca duyệt (chưa phải số trả).">Cần trả</th>
                    <th className="py-1 px-1 text-center">Lịch</th>
                    <th className="py-1 px-1 text-center">Vào</th>
                    <th className="py-1 px-1 text-center">Trễ</th>
                    <th className="py-1 px-1 text-center">Vắng</th>
                    <th className="py-1 px-1 text-center" title="Ca đã duyệt nhưng chưa check-in (sau giờ bắt đầu + 15 phút)">Thiếu CI</th>
                    <th className="py-1 px-2 text-center">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {storeStatus.map((row) => {
                    const sid = String(row.storeId);
                    return (
                    <tr key={row.storeId} className="border-b border-blue-gray-50 hover:bg-blue-gray-50/50">
                      <td className="py-0.5 px-2 font-medium max-w-[140px]">
                        <button type="button" onClick={() => focusStore(sid)} title={`${row.storeName} — xem NV / giờ / lương tháng`}
                          className="truncate max-w-full text-left hover:text-blue-700 hover:underline font-semibold">
                          {shortStoreName(row.storeName)}
                        </button>
                      </td>
                      <td className="py-0.5 px-1 text-right whitespace-nowrap" title={`Cần trả ${formatMoney(row.actualLaborCost ?? 0)} · Dự kiến ca ${formatMoney(row.estimatedLaborCost ?? 0)} · Giờ ${Number(row.workedHours || 0).toFixed(1)}h`}>
                        <button type="button" onClick={() => navigate("/dashboard/reports")} className="text-green-800 font-semibold hover:underline block w-full text-right">
                          {formatMoney(row.actualLaborCost ?? 0)}
                        </button>
                        <span className="text-[8px] text-purple-700 block">DK {formatMoney(row.estimatedLaborCost ?? 0)}</span>
                      </td>
                      <ClickCell className="py-0.5 px-1 text-center" onClick={() => goShifts({ storeId: sid, status: "Approved" })} title="Xem ca đã duyệt">
                        {row.scheduled}
                      </ClickCell>
                      <ClickCell className="py-0.5 px-1 text-center" onClick={() => goAttendance({ storeId: sid })} title="Xem chấm công">
                        {row.checkedIn}
                      </ClickCell>
                      <ClickCell className="py-0.5 px-1 text-center" onClick={() => goAttendance({ storeId: sid })} title="Xem đi trễ">
                        {row.late}
                      </ClickCell>
                      <ClickCell className="py-0.5 px-1 text-center" onClick={() => goAttendance({ storeId: sid })} title="Xem vắng">
                        {row.absent}
                      </ClickCell>
                      <ClickCell className="py-0.5 px-1 text-center" onClick={() => goShifts({ storeId: sid, status: "Pending" })} title="Phân ca bổ sung">
                        {row.missing}
                      </ClickCell>
                      <td className="py-0.5 px-2 text-center">
                        <button type="button" onClick={() => focusStore(sid)} title="Lọc cửa hàng này"
                          className={`inline-block min-w-[26px] rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white hover:opacity-90 ${
                          row.score >= 80 ? "bg-green-500" : row.score >= 60 ? "bg-amber-500" : "bg-red-500"
                        }`}>{row.score}</button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="xl:col-span-5 grid grid-cols-2 gap-2">
          <Panel title={isMonth ? `Chi phí nhân công · ${monthLabel}` : "Chi phí nhân công hôm nay"} bodyClass="p-2">
            <button type="button" onClick={() => navigate(dashUrl("/dashboard/reports", isMonth ? { month: String(laborMonth), year: String(laborYear) } : {}))} className="w-full text-left">
              {isMonth ? (
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="rounded bg-green-50 px-1.5 py-1 col-span-2">
                    <p className="text-green-700">Cần trả (công đã confirm)</p>
                    <p className="font-bold text-green-900 text-[12px]">{formatMoney(laborTotals.pay)}</p>
                  </div>
                  <div className="rounded bg-blue-50 px-1.5 py-1">
                    <p className="text-blue-600">Tổng giờ</p>
                    <p className="font-bold text-blue-900 text-[11px]">{laborTotals.hours.toFixed(1)}h</p>
                  </div>
                  <div className="rounded bg-teal-50 px-1.5 py-1">
                    <p className="text-teal-600">Giờ/NV</p>
                    <p className="font-bold text-teal-900">{laborTotals.count ? (laborTotals.hours / laborTotals.count).toFixed(1) : "0"}h</p>
                  </div>
                  <div className="rounded bg-blue-gray-50 px-1.5 py-1 col-span-2">
                    <p className="text-blue-gray-600">Công / NV</p>
                    <p className="font-bold text-blue-gray-900">{laborTotals.cong.toFixed(1)} công · {laborTotals.count} NV</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="rounded bg-green-50 px-1.5 py-1">
                      <p className="text-green-700">Cần trả (đã confirm)</p>
                      <p className="font-bold text-green-900 text-[11px]">{formatMoney(labor.confirmedPay ?? 0)}</p>
                    </div>
                    <div className="rounded bg-purple-50 px-1.5 py-1">
                      <p className="text-purple-600">Dự kiến (ca duyệt)</p>
                      <p className="font-bold text-purple-900 text-[11px]">{formatMoney(labor.estimatedPay ?? 0)}</p>
                    </div>
                    <div className="rounded bg-blue-50 px-1.5 py-1">
                      <p className="text-blue-600">Đủ ca</p>
                      <p className="font-bold text-blue-900">{labor.approvedStaff ?? 0}/{labor.requiredStaff ?? 0}</p>
                    </div>
                    <div className="rounded bg-teal-50 px-1.5 py-1">
                      <p className="text-teal-600">Giờ làm</p>
                      <p className="font-bold text-teal-900">{Number(labor.workedHours ?? 0).toFixed(1)}h</p>
                    </div>
                  </div>
                  {labor.estimatedPay > 0 && (
                    <p className={`text-[9px] mt-1.5 font-medium ${costVariance <= 0 ? "text-green-600" : "text-red-600"}`}>
                      Chênh lệch {costVariance > 0 ? "+" : ""}{costVariance}% so với dự kiến ca
                      {(labor.confirmedPay ?? 0) === 0 ? " · Chưa confirm công → cần trả = 0" : ""}
                    </p>
                  )}
                </>
              )}
            </button>
          </Panel>

          {isMonth ? (
            <Panel title="Tiến độ công (TB)" bodyClass="p-1 flex justify-center">
              <ScoreGauge compact
                score={congProgress}
                onTimeRate={congProgress}
                staffingRate={Math.min(100, Math.round((filteredMonthStores.length / Math.max(1, headcount.stores || stores.length)) * 100))}
                absenceRate={Math.max(0, 100 - congProgress)}
                overtimeRate={0}
              />
            </Panel>
          ) : score ? (
            <Panel title="Điểm vận hành" bodyClass="p-1 flex justify-center">
              <ScoreGauge compact
                score={score.score}
                onTimeRate={score.onTimeRate}
                staffingRate={score.staffingRate}
                absenceRate={score.absenceRate}
                overtimeRate={0}
              />
            </Panel>
          ) : (
            <Panel title="Điểm vận hành" bodyClass="p-2 text-[10px] text-gray-400">Chưa có điểm.</Panel>
          )}

          <Panel
            title={isMonth ? `Top cần trả · ${monthLabel}` : "Cảnh báo cần xử lý"}
            className="col-span-2"
            actionLabel={isMonth ? "Bảng NV ↓" : "Xem tất cả"}
            onAction={() => (isMonth
              ? document.getElementById("dash-store-labor")?.scrollIntoView({ behavior: "smooth" })
              : goAttendance())}
            bodyClass="p-2 max-h-[72px] overflow-y-auto"
          >
            {isMonth ? (
              topMonthPayEmployees.length === 0 ? (
                <p className="text-[10px] text-gray-400">Chưa có dữ liệu.</p>
              ) : (
                <ul className="space-y-1">
                  {topMonthPayEmployees.map((r) => (
                    <li key={`${r.employeeId}-${r.storeId}`}>
                      <button type="button" onClick={() => focusStore(r.storeId)}
                        className="flex justify-between gap-2 text-[10px] w-full text-left hover:bg-purple-50 rounded px-0.5 -mx-0.5">
                        <span className="truncate min-w-0">
                          <span className="font-semibold">{r.employeeName}</span>
                          <span className="text-blue-600"> · {shortStoreName(r.storeName)}</span>
                        </span>
                        <span className="shrink-0 font-semibold text-purple-800">{Number(r.estimatedPay).toLocaleString("en-US")} đ</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <ul className="space-y-1">
                {(data?.alerts || []).slice(0, 6).map((a, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => handleAlertClick(a)}
                      className="flex items-start gap-1.5 text-[10px] leading-snug w-full text-left hover:bg-amber-50 rounded px-0.5 -mx-0.5">
                      <AlertLevel level={a.level} />
                      <span className="truncate">{a.storeName ? `${shortStoreName(a.storeName)}: ` : ""}{a.message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Hàng 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        <Panel
          title={isMonth ? `Top giờ / CH · ${monthLabel}` : `Timeline ca · ${formatDateVi(workDate)}`}
          className="lg:col-span-5"
          bodyClass="p-2 max-h-[100px] overflow-y-auto"
        >
          {isMonth ? (
            topMonthHours.length === 0 ? (
              <p className="text-[10px] text-gray-400">Chưa có giờ confirm.</p>
            ) : (
              <div className="space-y-1">
                {topMonthHours.map((t) => {
                  const maxH = topMonthHours[0]?.hours || 1;
                  return (
                    <button key={t.storeId} type="button" onClick={() => focusStore(t.storeId)}
                      className="flex items-center gap-2 text-[10px] w-full text-left hover:bg-blue-50 rounded">
                      <span className="font-semibold w-[110px] shrink-0 truncate" title={t.name}>{shortStoreName(t.name)}</span>
                      <div className="flex-1 h-1.5 bg-blue-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(t.hours / maxH) * 100}%` }} />
                      </div>
                      <span className="shrink-0 text-blue-gray-500">{t.hours.toFixed(1)}h</span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (data?.shiftTimeline || []).length === 0 ? (
            <p className="text-[10px] text-gray-400">Không có ca duyệt.</p>
          ) : (
            <div className="space-y-1">
              {data.shiftTimeline.map((t) => (
                <div key={`${t.start}-${t.end}`} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono font-semibold w-[72px] shrink-0">{t.start}–{t.end}</span>
                  <div className="flex-1 h-1.5 bg-blue-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${t.scheduledCount ? (t.checkedInCount / t.scheduledCount) * 100 : 0}%` }} />
                  </div>
                  <span className="shrink-0 text-blue-gray-500">{t.checkedInCount}/{t.scheduledCount}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title={isMonth ? `Top NV cần trả (${topMonthPayEmployees.length})` : `Đang làm (${data?.currentlyWorking?.length || 0})`}
          className="lg:col-span-4"
          bodyClass="p-2 max-h-[120px] overflow-y-auto"
        >
          {isMonth ? (
            topMonthPayEmployees.length === 0 ? (
              <p className="text-[10px] text-gray-400">Chưa có dữ liệu.</p>
            ) : (
              <ul className="space-y-0.5">
                {topMonthPayEmployees.map((w) => (
                  <li key={`pay-${w.employeeId}-${w.storeId}`}>
                    <button type="button" onClick={() => focusStore(w.storeId)}
                      className="flex justify-between gap-2 text-[10px] w-full text-left hover:bg-green-50 rounded px-0.5 -mx-0.5">
                      <span className="min-w-0 flex-1">
                        <span className="font-medium truncate block">{w.employeeName}</span>
                        <span className="text-[9px] text-blue-600 truncate block">{shortStoreName(w.storeName)}</span>
                      </span>
                      <span className="text-purple-800 shrink-0 self-center font-semibold">{Number(w.estimatedPay).toLocaleString("en-US")}đ</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (data?.currentlyWorking || []).length === 0 ? (
            <p className="text-[10px] text-gray-400">Không có NV trong ca.</p>
          ) : (
            <ul className="space-y-0.5">
              {data.currentlyWorking.map((w) => (
                <li key={`${w.employeeId}-${w.storeId}`}>
                  <button type="button"
                    onClick={() => goAttendance({ storeId: resolveStoreId(w.storeName, w.storeId) })}
                    className="flex justify-between gap-2 text-[10px] w-full text-left hover:bg-green-50 rounded px-0.5 -mx-0.5">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium truncate block">{w.employeeName}</span>
                      <span className="text-[9px] text-blue-600 truncate block" title={w.storeName}>
                        {shortStoreName(w.storeName)}
                      </span>
                    </span>
                    <span className="text-blue-gray-500 shrink-0 self-center">{w.since}→{w.scheduledEnd}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={isMonth ? `Top NV theo giờ (${topMonthHourEmployees.length})` : `Chưa check-in (${missingCheckInCount})`}
          className="lg:col-span-3"
          bodyClass="p-2 max-h-[120px] overflow-y-auto"
        >
          {isMonth ? (
            topMonthHourEmployees.length === 0 ? (
              <p className="text-[10px] text-gray-400">Chưa có dữ liệu.</p>
            ) : (
              <ul className="space-y-0.5">
                {topMonthHourEmployees.map((m) => (
                  <li key={`hr-${m.employeeId}-${m.storeId}`}>
                    <button type="button" onClick={() => focusStore(m.storeId)}
                      className="text-[10px] leading-snug w-full text-left hover:bg-blue-50 rounded px-0.5 -mx-0.5">
                      <span className="font-semibold block truncate">{m.employeeName}</span>
                      <span className="text-[9px] text-blue-600 block truncate">{shortStoreName(m.storeName)}</span>
                      <span className="text-blue-gray-500 block">{Number(m.workedHours).toFixed(1)}h · {Number(m.workedDays).toFixed(1)} công</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : missingCheckInCount === 0 ? (
            <p className="text-[10px] text-green-700">Đã đủ / chưa tới giờ.</p>
          ) : (
            <ul className="space-y-0.5">
              {(data?.missingCheckIn || []).map((m) => (
                <li key={`${m.employeeId}-${m.storeId}-${m.scheduledStart}`}>
                  <button type="button"
                    onClick={() => goAttendance({ storeId: resolveStoreId(m.storeName, m.storeId) })}
                    className="text-[10px] leading-snug w-full text-left hover:bg-red-50 rounded px-0.5 -mx-0.5">
                    <span className="font-semibold block truncate">{m.employeeName}</span>
                    <span className="text-[9px] text-blue-600 block truncate" title={m.storeName}>
                      {shortStoreName(m.storeName)}
                    </span>
                    <span className="text-blue-gray-500 block">{m.scheduledStart}–{m.scheduledEnd}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Hàng 4 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
        <Panel title={isMonth ? "Xu hướng gần đây (7 ngày)" : "Xu hướng 7 ngày"} bodyClass="p-1.5">
          {last7.length === 0 ? (
            <p className="text-[10px] text-gray-400 text-center py-6">
              {isMonth ? "Bật chế độ Ngày để nạp xu hướng, hoặc chọn lại sau khi có dữ liệu ngày." : "Chưa có dữ liệu."}
            </p>
          ) : (
            <TrendLineChart days={last7} compact />
          )}
        </Panel>

        <Panel title={isMonth ? "Chi phí gần đây (7 ngày)" : "Chi phí theo ngày"} bodyClass="p-1.5">
          {last7.length === 0 ? (
            <p className="text-[10px] text-gray-400 text-center py-6">Chưa có dữ liệu.</p>
          ) : (
            <CostComboChart days={last7} compact />
          )}
        </Panel>

        <Panel
          title={isMonth ? `Giờ công / CH · ${monthLabel}` : "Giờ công hôm nay / CH"}
          actionLabel={isMonth ? "Bảng NV ↓" : "Xem theo tháng →"}
          onAction={() => {
            if (isMonth) document.getElementById("dash-store-labor")?.scrollIntoView({ behavior: "smooth" });
            else {
              setMonthVal(workDate.slice(0, 7));
              setViewMode("month");
            }
          }}
          bodyClass="p-2 max-h-[148px] overflow-y-auto"
        >
          {(isMonth ? topMonthHours : topHours).length === 0 ? (
            <p className="text-[10px] text-gray-400">
              {isMonth ? "Tháng này chưa có giờ confirm." : "Hôm nay chưa có giờ confirm (0h). Khác với bảng NV bên dưới = cả tháng."}
            </p>
          ) : (
            <StoreHoursBarChart
              items={(isMonth ? topMonthHours : topHours).slice(0, 5)}
              compact
              onItemClick={(x) => focusStore(x.storeId)}
            />
          )}
        </Panel>

        <div className="space-y-2">
          <Panel title="Phê duyệt nhanh" bodyClass="p-1.5">
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {quickActions.map((qa) => (
                <button key={qa.label} type="button" onClick={qa.onClick}
                  className="relative rounded border border-blue-gray-200 px-1.5 py-2 hover:bg-blue-50 text-left truncate">
                  {qa.label}
                  {qa.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                      {qa.badge > 99 ? "99+" : qa.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title={isMonth ? `Top NV · ${monthLabel}` : "Top NV (7 ngày)"} bodyClass="p-2 max-h-[72px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-x-2 text-[9px]">
              <div>
                <p className="font-semibold text-green-700 mb-0.5">{isMonth ? "Giờ nhiều" : "Chuyên cần"}</p>
                {isMonth
                  ? topMonthHourEmployees.slice(0, 3).map((e, i) => (
                    <button key={e.employeeId} type="button"
                      onClick={() => navigate(dashUrl("/dashboard/employees", { q: e.employeeName }))}
                      className="block truncate w-full text-left hover:text-green-800 hover:underline">
                      {i + 1}. {e.employeeName}
                    </button>
                  ))
                  : (data?.topDiligent || []).slice(0, 3).map((e, i) => (
                    <button key={e.employeeId} type="button"
                      onClick={() => navigate(dashUrl("/dashboard/employees", { q: e.employeeName }))}
                      className="block truncate w-full text-left hover:text-green-800 hover:underline">
                      {i + 1}. {e.employeeName}
                    </button>
                  ))}
              </div>
              <div>
                <p className="font-semibold text-purple-700 mb-0.5">{isMonth ? "Cần trả cao" : "Vi phạm"}</p>
                {isMonth
                  ? topMonthPayEmployees.slice(0, 3).map((e, i) => (
                    <button key={`p-${e.employeeId}`} type="button"
                      onClick={() => navigate(dashUrl("/dashboard/employees", { q: e.employeeName }))}
                      className="block truncate w-full text-left hover:text-purple-800 hover:underline">
                      {i + 1}. {e.employeeName}
                    </button>
                  ))
                  : (data?.topViolations || []).slice(0, 3).map((e, i) => (
                    <button key={e.employeeId} type="button"
                      onClick={() => navigate(dashUrl("/dashboard/attendance", { date: workDate }))}
                      className="block truncate w-full text-left hover:text-red-800 hover:underline">
                      {i + 1}. {e.employeeName}
                    </button>
                  ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
      {/* Bảng NV / CH / giờ / lương — dùng chung Ngày & Tháng; chọn tháng ở header khi mode Tháng */}
      <Panel
        id="dash-store-labor"
        title={storeId
          ? `NV / giờ / lương · ${stores.find((s) => String(s.id) === String(storeId))?.name || "CH đã chọn"} · ${monthLabel}`
          : `Giờ & lương NV theo cửa hàng · ${monthLabel}`}
        actionLabel={storeId ? "Xem tất cả CH" : "Mở Báo cáo →"}
        onAction={() => {
          if (storeId) {
            setStoreId("");
            setStoreQuery("");
          } else {
            navigate(dashUrl("/dashboard/reports", {
              month: String(laborMonth),
              year: String(laborYear),
            }));
          }
        }}
        bodyClass="p-0"
      >
        <div className="text-[9px] text-blue-gray-600 px-2 pt-1.5 pb-1 border-b border-blue-gray-50 space-y-0.5">
          <p>
            <strong>Cần trả</strong> = tiền theo <strong>công đã confirm</strong> (QL đã duyệt chấm công) — không phải dự kiến theo ca.
            {" "}Tháng cứng: 8h ≈ 1 công, đủ 26 công = full; Part-time: theo giờ. Chưa gồm PC / thưởng / BH trên bảng lương chính thức.
          </p>
          <p>
            {viewMode === "month"
              ? "Bấm tên CH ở bảng trên để xem DS NV + tổng CH."
              : "Bấm tên CH ở bảng «Tình trạng nhân sự» để xem DS NV + tổng CH."}
            {!laborLoading && laborTotals.count > 0 && (
              <span className="font-semibold text-green-800">
                {" "}· {laborTotals.count} NV · {laborTotals.hours.toFixed(1)}h · {laborTotals.cong.toFixed(1)} công · cần trả{" "}
                {laborTotals.pay.toLocaleString("en-US")} đ
              </span>
            )}
          </p>
        </div>
        {storeId && !laborLoading && laborTotals.count > 0 && (
          <div className="grid grid-cols-4 gap-1 px-2 py-1.5 bg-green-50 border-b border-green-100 text-[10px]">
            <div><span className="text-blue-gray-500">NV</span> <strong>{laborTotals.count}</strong></div>
            <div><span className="text-blue-gray-500">Giờ</span> <strong>{laborTotals.hours.toFixed(1)}h</strong></div>
            <div><span className="text-blue-gray-500">Công</span> <strong>{laborTotals.cong.toFixed(2)}</strong></div>
            <div className="text-right"><span className="text-blue-gray-500">Cần trả CH</span> <strong className="text-green-800">{laborTotals.pay.toLocaleString("en-US")} đ</strong></div>
          </div>
        )}
        <div className="overflow-auto max-h-[280px]">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-blue-gray-500 border-b border-blue-gray-100">
                {!storeId && (
                  <th className="py-1 px-2 text-left font-semibold cursor-pointer hover:text-blue-700" onClick={() => toggleLaborSort("storeName")}>
                    Cửa hàng {laborSortKey === "storeName" ? (laborSortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                )}
                <th className="py-1 px-2 text-left font-semibold cursor-pointer hover:text-blue-700" onClick={() => toggleLaborSort("employeeName")}>
                  Nhân viên {laborSortKey === "employeeName" ? (laborSortDir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="py-1 px-1 text-center font-semibold cursor-pointer hover:text-blue-700" onClick={() => toggleLaborSort("workedDays")}>
                  Công {laborSortKey === "workedDays" ? (laborSortDir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="py-1 px-1 text-center font-semibold cursor-pointer hover:text-blue-700" onClick={() => toggleLaborSort("workedHours")}>
                  Giờ {laborSortKey === "workedHours" ? (laborSortDir === "asc" ? "↑" : "↓") : ""}
                </th>
                <th className="py-1 px-1 text-left">Cách tính</th>
                <th className="py-1 px-2 text-right font-semibold cursor-pointer hover:text-blue-700" onClick={() => toggleLaborSort("estimatedPay")}
                  title="Số tiền cần trả theo công đã confirm (chưa gồm PC/thưởng/BH trên bảng lương)">
                  Cần trả {laborSortKey === "estimatedPay" ? (laborSortDir === "asc" ? "↑" : "↓") : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {laborLoading ? (
                <tr><td colSpan={storeId ? 5 : 6} className="py-6 text-center text-gray-400">Đang tải...</td></tr>
              ) : laborGroupedRows.length === 0 ? (
                <tr><td colSpan={storeId ? 5 : 6} className="py-6 text-center text-gray-400">Chưa có công confirm trong tháng này{storeId ? " tại CH này" : ""}</td></tr>
              ) : laborGroupedRows.map((item) => {
                if (item.kind === "storeTotal") {
                  return (
                    <tr key={`t-${item.storeId}`} className="bg-blue-gray-50 border-b border-blue-gray-200">
                      <td className="py-1 px-2 font-bold text-blue-gray-800" colSpan={1}>
                        <button type="button" className="hover:underline text-left" onClick={() => focusStore(item.storeId)}>
                          {shortStoreName(item.storeName)} · {item.empCount} NV
                        </button>
                      </td>
                      <td className="py-1 px-1 text-center font-bold">{item.workedDays.toFixed(1)}</td>
                      <td className="py-1 px-1 text-center font-bold">{item.workedHours.toFixed(1)}h</td>
                      <td className="py-1 px-1 text-[9px] text-blue-gray-500">Tổng CH</td>
                      <td className="py-1 px-2 text-right font-bold text-purple-900 whitespace-nowrap">
                        {item.estimatedPay.toLocaleString("en-US")} đ
                      </td>
                    </tr>
                  );
                }
                const r = item.row;
                return (
                  <tr key={`${r.storeId}-${r.employeeId}`} className="border-b border-blue-gray-50 hover:bg-blue-gray-50/50">
                    {!storeId && (
                      <td className="py-0.5 px-2 max-w-[120px] text-blue-gray-400 text-[9px]">
                        {shortStoreName(r.storeName)}
                      </td>
                    )}
                    <td className="py-0.5 px-2">
                      <span className="font-medium">{r.employeeName}</span>
                      <span className="text-[8px] text-gray-400 ml-1 font-mono">{r.employeeCode}</span>
                    </td>
                    <td className="py-0.5 px-1 text-center">{Number(r.workedDays).toFixed(2)}</td>
                    <td className="py-0.5 px-1 text-center">{Number(r.workedHours).toFixed(1)}h</td>
                    <td className="py-0.5 px-1 text-[9px] text-blue-gray-600" title={formatRateLabel(r)}>
                      {r.salaryType === "Monthly" ? (
                        <span><span className="font-semibold text-indigo-700">Theo công</span> · {(Number(r.baseRate) / 1e6).toFixed(1)}tr/26</span>
                      ) : (
                        <span><span className="font-semibold text-teal-700">Theo giờ</span> · {Number(r.baseRate).toLocaleString("en-US")}đ/h</span>
                      )}
                    </td>
                    <td className="py-0.5 px-2 text-right font-semibold text-purple-800 whitespace-nowrap">
                      {Number(r.estimatedPay).toLocaleString("en-US")} đ
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Footer tổng quan */}
      <div className="rounded-lg border border-blue-gray-100 bg-white px-2 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-blue-gray-600">
        {viewMode === "month" ? (
          <>
            <span><strong className="text-blue-gray-800">{laborTotals.count}</strong> NV có công · {monthLabel}</span>
            <span><strong className="text-blue-gray-800">{filteredMonthStores.length}</strong> cửa hàng</span>
            <span>Giờ: <strong className="text-green-700">{laborTotals.hours.toFixed(1)}h</strong></span>
            <span>Công: <strong>{laborTotals.cong.toFixed(1)}</strong></span>
            <span>Cần trả: <strong className="text-green-800">{laborTotals.pay.toLocaleString("en-US")} đ</strong></span>
          </>
        ) : (
          <>
            <span><strong className="text-blue-gray-800">{headcount.employees || scheduled}</strong> NV hệ thống</span>
            <span><strong className="text-blue-gray-800">{headcount.stores || storeStatus.length}</strong> cửa hàng</span>
            <span>Đang làm: <strong className="text-green-700">{data?.currentlyWorking?.length || 0}</strong></span>
            <span>Có ca hôm nay: <strong>{scheduled}</strong></span>
            <span>Check-in: <strong className="text-green-700">{kpi.checkedIn ?? 0}</strong> ({kpiPct(kpi.checkedIn, scheduled) || "—"})</span>
            <span>Vắng: <strong className="text-red-600">{kpi.onLeave ?? 0}</strong></span>
          </>
        )}
        <button type="button" onClick={() => navigate("/dashboard/stores")}
          className="ml-auto text-blue-600 hover:underline">Quản lý CH →</button>
      </div>
    </div>
  );
}
