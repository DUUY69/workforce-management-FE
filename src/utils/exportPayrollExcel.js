import * as XLSX from "xlsx";
import { formatHourlyRate, formatHoursMinutes, toBankAccountHolderName } from "./formatMoney.js";

function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

const STATUS_MAP = { Draft: "Nháp", Approved: "Đã duyệt", Paid: "Đã trả" };
const CONFIRM_MAP = {
  Pending: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  AutoConfirmed: "Tự xác nhận",
  None: "—",
};

/** Các ô chi tiết từ "Nhân viên" đến "NV xác nhận" — dùng chung cho xuất đơn và xuất nhiều bảng. */
function detailCells(d, net) {
  const att = Number(d.attendanceDays);
  const conf = d.employeeConfirmStatus || "None";
  return [
    `${d.employeeName || ""}${d.employeeCode ? ` (${d.employeeCode})` : ""}`,
    Number.isFinite(att) && att > 0 ? att : "",
    money(d.workedDays),
    formatHoursMinutes(d.workedHours),
    formatHourlyRate(d),
    money(d.grossSalary),
    money(d.bonus),
    money(d.deliveryAllowance),
    d.note || "",
    money(d.deduction),
    toBankAccountHolderName(d.bankName) || d.bankName || "",
    toBankAccountHolderName(d.bankAccountName) || d.bankAccountName || "",
    d.bankAccountNo == null ? "" : String(d.bankAccountNo),
    net,
    CONFIRM_MAP[conf] || conf,
  ];
}

/** Chức vụ theo employeeId từ Map<id, nhãn> (hồ sơ nhân viên); thiếu hồ sơ thì để trống, không đoán. */
function positionOf(positions, d) {
  if (!positions || d.employeeId == null) return "";
  return positions.get(String(d.employeeId)) ?? positions.get(d.employeeId) ?? "";
}

/** Các ô chuyển khoản từ "Nhân viên" đến "Nội dung CK" (cửa hàng lấy từ bảng lương nguồn). */
function bankCells(payroll, d, net, positions) {
  return [
    d.employeeName || "",
    d.employeeCode || "",
    payroll?.storeName || "",
    positionOf(positions, d),
    toBankAccountHolderName(d.bankName) || d.bankName || "",
    toBankAccountHolderName(d.bankAccountName) || d.bankAccountName || "",
    d.bankAccountNo == null ? "" : String(d.bankAccountNo),
    net,
    `Luong T${payroll?.month}/${payroll?.year} ${d.employeeCode || ""}`.trim(),
  ];
}

/**
 * Xuất Excel bảng lương — cột theo đúng thứ tự UI chi tiết.
 */
export function buildPayrollWorkbook(payroll, details, { getNet, positions } = {}) {
  const calcNet =
    getNet ||
    ((d) => money(d.grossSalary) + money(d.bonus) + money(d.deliveryAllowance) - money(d.deduction));

  const store = payroll?.storeName || "CuaHang";
  const period = `T${payroll?.month || "?"}-${payroll?.year || "?"}`;
  const status = STATUS_MAP[payroll?.status] || payroll?.status || "";

  const title = [
    [`BẢNG LƯƠNG — ${store}`],
    [`Kỳ: Tháng ${payroll?.month}/${payroll?.year}`, `Trạng thái: ${status}`, `Tổng NV: ${details.length}`],
    [
      `Ngày tạo: ${payroll?.createdAt || ""}`,
      payroll?.createdByName ? `Người tạo: ${payroll.createdByName}` : "",
      payroll?.approvedByName ? `Người duyệt: ${payroll.approvedByName}` : "",
    ],
    [],
  ];

  const headers = [
    "STT",
    "Nhân viên",
    "Ngày đi làm",
    "Ngày công",
    "Số giờ",
    "Mức lương",
    "Lương gộp",
    "Thưởng",
    "Phụ cấp",
    "Ghi chú",
    "Khấu trừ",
    "Tên ngân hàng",
    "Tên TK",
    "Số tài khoản",
    "Thực nhận",
    "NV xác nhận",
  ];

  const rows = details.map((d, i) => [i + 1, ...detailCells(d, calcNet(d))]);

  const totalNet = details.reduce((s, d) => s + calcNet(d), 0);
  const totalGross = details.reduce((s, d) => s + money(d.grossSalary), 0);
  const totalHours = details.reduce((s, d) => s + money(d.workedHours), 0);
  const totalCong = details.reduce((s, d) => s + money(d.workedDays), 0);
  const totalAtt = details.reduce((s, d) => {
    const a = Number(d.attendanceDays);
    return s + (Number.isFinite(a) && a > 0 ? a : 0);
  }, 0);
  const footer = [
    [],
    [
      "",
      "TỔNG",
      totalAtt || "",
      totalCong,
      formatHoursMinutes(totalHours),
      "",
      totalGross,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalNet,
      "",
    ],
  ];

  const sheetData = [...title, headers, ...rows, ...footer];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [
    { wch: 5 }, { wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 36 }, { wch: 12 }, { wch: 16 },
    { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 15 } }];

  const bankHeaders = ["STT", "Nhân viên", "Mã NV", "Cửa hàng", "Chức vụ", "Tên ngân hàng", "Tên tài khoản", "Số tài khoản", "Số tiền (thực nhận)", "Nội dung CK"];
  const bankRows = details.map((d, i) => [i + 1, ...bankCells(payroll, d, calcNet(d), positions)]);
  const bankSheet = XLSX.utils.aoa_to_sheet([
    [`DANH SÁCH CHUYỂN KHOẢN — ${store} — ${period}`],
    [],
    bankHeaders,
    ...bankRows,
    [],
    ["", "", "", "", "", "", "", "TỔNG", totalNet, ""],
  ]);
  bankSheet["!cols"] = [
    { wch: 5 }, { wch: 22 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 28 },
  ];
  bankSheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bang luong");
  XLSX.utils.book_append_sheet(wb, bankSheet, "Chuyen khoan");

  const safeStore = String(store).replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
  const fileName = `BangLuong_${safeStore}_${period}.xlsx`;
  return { wb, fileName };
}

export function exportPayrollExcel(payroll, details, options = {}) {
  const { wb, fileName } = buildPayrollWorkbook(payroll, details, options);
  XLSX.writeFile(wb, fileName);
  return fileName;
}

/**
 * Xuất Excel danh sách — cột theo đúng thứ tự UI danh sách.
 */
export function exportPayrollListExcel(payrolls, { periodLabel = "" } = {}) {
  const statusMap = { Draft: "Nháp", Approved: "Đã duyệt", Paid: "Đã trả" };
  const list = Array.isArray(payrolls) ? payrolls : [];
  const headers = [
    "STT",
    "Cửa hàng",
    "Kỳ",
    "Tổng giờ",
    "Tổng công",
    "Tổng tiền",
    "Ngày tạo",
    "Người tạo",
    "Người duyệt",
    "Trạng thái",
    "NV xác nhận",
  ];
  const rows = list.map((p, i) => {
    const nv = Number(p.employeeCount || p.details?.length || 0);
    const confirmed = Number(p.confirmedEmployeeCount || 0);
    const pending = Number(p.pendingConfirmCount || 0);
    const confirmLabel =
      p.status === "Approved" || p.status === "Paid"
        ? `${confirmed}/${nv}${pending ? ` (chờ ${pending})` : ""}`
        : "—";
    return [
      i + 1,
      p.storeName || "",
      `T.${p.month}/${p.year}`,
      formatHoursMinutes(p.totalWorkedHours ?? 0),
      money(p.totalWorkedDays ?? 0),
      money(p.totalAmount),
      p.createdAt || "",
      p.createdByName || "",
      p.approvedByName
        ? `${p.approvedByName}${p.approvedAt ? ` · ${p.approvedAt}` : ""}`
        : "",
      statusMap[p.status] || p.status || "",
      confirmLabel,
    ];
  });
  const sumHours = list.reduce((s, p) => s + money(p.totalWorkedHours), 0);
  const sumCong = list.reduce((s, p) => s + money(p.totalWorkedDays), 0);
  const sumMoney = list.reduce((s, p) => s + money(p.totalAmount), 0);
  const sumConfirmed = list.reduce((s, p) => s + Number(p.confirmedEmployeeCount || 0), 0);
  const sumNv = list.reduce((s, p) => s + Number(p.employeeCount || 0), 0);
  const footer = [
    [],
    ["", "TỔNG", "", formatHoursMinutes(sumHours), sumCong, sumMoney, "", "", "", "", `${sumConfirmed}/${sumNv}`],
  ];
  const title = [
    ["DANH SÁCH BẢNG LƯƠNG"],
    [periodLabel ? `Bộ lọc: ${periodLabel}` : "", `Số bảng: ${list.length}`],
    [],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...title, headers, ...rows, ...footer]);
  ws["!cols"] = [
    { wch: 5 }, { wch: 32 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
    { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 16 },
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Danh sach");
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `DanhSach_BangLuong_${stamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

export function rateLabel(d) {
  return formatHourlyRate(d);
}

const EXCEL_MAX_ROWS = 1048576;
const NET_TOLERANCE = 0.01;
const REQUIRED_NUMBERS = ["grossSalary", "bonus", "deduction", "workedDays", "workedHours"];

function payrollRef(p, fallbackId) {
  return `${p?.storeName || "?"} — T.${p?.month ?? "?"}/${p?.year ?? "?"} (ID ${p?.id ?? fallbackId})`;
}

function isFiniteNumber(v) {
  return typeof v === "number" ? Number.isFinite(v) : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v));
}

/**
 * Kiểm tra payload GET /payrolls/{id} trước khi xuất nhiều bảng.
 * Throw Error (thông báo tiếng Việt, có cửa hàng/kỳ/ID) khi dữ liệu thiếu hoặc sai — không đổi lỗi thành 0.
 */
export function assertValidPayrollForExport(payroll, expectedId) {
  const ref = payrollRef(payroll, expectedId);
  if (!payroll || typeof payroll !== "object") throw new Error(`Bảng lương ID ${expectedId}: phản hồi không hợp lệ`);
  if (expectedId != null && String(payroll.id) !== String(expectedId)) {
    throw new Error(`Bảng lương ID ${expectedId}: phản hồi trả về ID ${payroll.id}`);
  }
  const month = Number(payroll.month);
  const year = Number(payroll.year);
  if (!payroll.storeName || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
    throw new Error(`${ref}: thiếu hoặc sai thông tin cửa hàng/kỳ`);
  }
  if (!Array.isArray(payroll.details)) throw new Error(`${ref}: thiếu danh sách chi tiết`);
  const seen = new Set();
  payroll.details.forEach((d, i) => {
    if (!d || typeof d !== "object") throw new Error(`${ref}: dòng ${i + 1} không hợp lệ`);
    if (d.id != null) {
      if (seen.has(String(d.id))) throw new Error(`${ref}: trùng ID chi tiết ${d.id}`);
      seen.add(String(d.id));
    }
    for (const k of REQUIRED_NUMBERS) {
      if (!isFiniteNumber(d[k])) throw new Error(`${ref}: dòng ${i + 1} (${d.employeeName || d.id || "?"}) sai giá trị ${k}`);
    }
    if (d.deliveryAllowance != null && !isFiniteNumber(d.deliveryAllowance)) {
      throw new Error(`${ref}: dòng ${i + 1} (${d.employeeName || d.id || "?"}) sai giá trị deliveryAllowance`);
    }
    if (d.netSalary != null && isFiniteNumber(d.netSalary)) {
      const net = money(d.grossSalary) + money(d.bonus) + money(d.deliveryAllowance) - money(d.deduction);
      if (Math.abs(net - Number(d.netSalary)) > NET_TOLERANCE) {
        throw new Error(`${ref}: dòng ${i + 1} (${d.employeeName || d.id || "?"}) thực nhận tính lại ${net} khác netSalary ${d.netSalary}`);
      }
    }
  });
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Tạo workbook (chưa ghi file) gồm 2 sheet gộp "Bang luong" và "Chuyen khoan" từ nhiều bảng lương đã có chi tiết.
 * Thứ tự dòng theo thứ tự mảng `payrolls`; mỗi detail là một dòng, không gộp theo nhân viên/cửa hàng/kỳ.
 */
export function buildPayrollBulkWorkbook(payrolls, { filterLabel = "", exportedAt = new Date(), positions } = {}) {
  const list = Array.isArray(payrolls) ? payrolls : [];
  if (!list.length) throw new Error("Chưa chọn bảng lương");
  const ids = new Set();
  list.forEach((p) => {
    assertValidPayrollForExport(p, p?.id);
    if (ids.has(String(p.id))) throw new Error(`Trùng ID bảng lương ${p.id}`);
    ids.add(String(p.id));
  });
  const flat = list.flatMap((p) => p.details.map((d) => ({ p, d, net: money(d.grossSalary) + money(d.bonus) + money(d.deliveryAllowance) - money(d.deduction) })));
  if (!flat.length) throw new Error("Các bảng đã chọn không có chi tiết nhân viên để xuất");

  const period = (p) => `T${p.month}/${p.year}`;
  const src = (p) => [p.id, p.storeName, period(p), STATUS_MAP[p.status] || p.status || ""];
  const bankSrc = (p) => [p.id, period(p), STATUS_MAP[p.status] || p.status || ""];
  const stamp = exportedAt.toLocaleString("vi-VN");
  const sourceRows = list.map((p) => [...src(p), p.details.length]);

  const header = [
    "STT", "ID bảng lương", "Cửa hàng", "Kỳ", "Trạng thái", "Nhân viên", "Ngày đi làm", "Ngày công", "Số giờ",
    "Mức lương", "Lương gộp", "Thưởng", "Phụ cấp", "Ghi chú", "Khấu trừ", "Tên ngân hàng", "Tên TK",
    "Số tài khoản", "Thực nhận", "NV xác nhận",
  ];
  const rows = flat.map(({ p, d, net }, i) => [i + 1, ...src(p), ...detailCells(d, net)]);
  const sum = (fn) => round2(flat.reduce((s, x) => s + fn(x.d, x.net), 0));
  const totalNet = sum((_, net) => net);
  const totalAtt = flat.reduce((s, { d }) => {
    const a = Number(d.attendanceDays);
    return s + (Number.isFinite(a) && a > 0 ? a : 0);
  }, 0);
  const meta = [
    ["BẢNG LƯƠNG CHI TIẾT — NHIỀU BẢNG"],
    [filterLabel ? `Bộ lọc: ${filterLabel}` : "", `Số bảng: ${list.length}`, `Số dòng nhân viên: ${flat.length}`, `Xuất lúc: ${stamp}`],
    [],
    ["ID bảng lương", "Cửa hàng", "Kỳ", "Trạng thái", "Số dòng"],
    ...sourceRows,
    [],
  ];
  const footer = [
    [],
    [
      "", "", "", "", "", "TỔNG", totalAtt || "", sum((d) => money(d.workedDays)), formatHoursMinutes(sum((d) => money(d.workedHours))),
      "", sum((d) => money(d.grossSalary)), sum((d) => money(d.bonus)), sum((d) => money(d.deliveryAllowance)), "",
      sum((d) => money(d.deduction)), "", "", "", totalNet, "",
    ],
  ];
  const wsRows = [...meta, header, ...rows, ...footer];

  const bankHeader = [
    "STT", "ID bảng lương", "Kỳ", "Trạng thái", "Nhân viên", "Mã NV", "Cửa hàng", "Chức vụ", "Tên ngân hàng",
    "Tên tài khoản", "Số tài khoản", "Số tiền (thực nhận)", "Nội dung CK",
  ];
  const bankRows = flat.map(({ p, d, net }, i) => [i + 1, ...bankSrc(p), ...bankCells(p, d, net, positions)]);
  const bankMeta = [
    ["DANH SÁCH CHUYỂN KHOẢN — NHIỀU BẢNG"],
    [filterLabel ? `Bộ lọc: ${filterLabel}` : "", `Số bảng: ${list.length}`, `Số dòng: ${flat.length}`, `Xuất lúc: ${stamp}`],
    [],
  ];
  const bankAll = [...bankMeta, bankHeader, ...bankRows, [], ["", "", "", "", "", "", "", "", "", "", "TỔNG", totalNet, ""]];

  if (wsRows.length > EXCEL_MAX_ROWS || bankAll.length > EXCEL_MAX_ROWS) {
    throw new Error("Số dòng vượt giới hạn của Excel, hãy chọn ít bảng hơn");
  }

  const ws = XLSX.utils.aoa_to_sheet(wsRows);
  ws["!cols"] = [
    { wch: 5 }, { wch: 12 }, { wch: 26 }, { wch: 10 }, { wch: 12 }, { wch: 26 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 36 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 20 },
    { wch: 14 }, { wch: 14 },
  ];
  const bankSheet = XLSX.utils.aoa_to_sheet(bankAll);
  bankSheet["!cols"] = [
    { wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 26 }, { wch: 14 }, { wch: 18 },
    { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 28 },
  ];
  // Ép cột số tài khoản là text (giữ số 0 đầu)
  const forceText = (sheet, col, firstRow, count) => {
    for (let r = firstRow; r < firstRow + count; r++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: col })];
      if (cell) { cell.t = "s"; cell.z = "@"; }
    }
  };
  forceText(ws, 17, meta.length + 1, rows.length);
  forceText(bankSheet, 10, bankMeta.length + 1, bankRows.length);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bang luong");
  XLSX.utils.book_append_sheet(wb, bankSheet, "Chuyen khoan");
  return wb;
}

export function payrollBulkFileName(count, date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  return `BangLuong_ChiTiet_${count}Bang_${stamp}.xlsx`;
}

/** Ghi một file .xlsx duy nhất cho nhiều bảng lương. */
export function exportPayrollBulkExcel(payrolls, { filterLabel = "", positions } = {}) {
  const now = new Date();
  const wb = buildPayrollBulkWorkbook(payrolls, { filterLabel, exportedAt: now, positions });
  const fileName = payrollBulkFileName(payrolls.length, now);
  XLSX.writeFile(wb, fileName);
  return fileName;
}