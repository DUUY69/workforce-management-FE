import * as XLSX from "xlsx";
import { formatHourlyRate, formatHoursMinutes, toBankAccountHolderName } from "@/utils/formatMoney";

function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Xuất Excel bảng lương — cột theo đúng thứ tự UI chi tiết.
 */
export function exportPayrollExcel(payroll, details, { getNet } = {}) {
  const calcNet =
    getNet ||
    ((d) => money(d.grossSalary) + money(d.bonus) + money(d.deliveryAllowance) - money(d.deduction));

  const store = payroll?.storeName || "CuaHang";
  const period = `T${payroll?.month || "?"}-${payroll?.year || "?"}`;
  const statusMap = { Draft: "Nháp", Approved: "Đã duyệt", Paid: "Đã trả" };
  const confirmMap = {
    Pending: "Chờ xác nhận",
    Confirmed: "Đã xác nhận",
    AutoConfirmed: "Tự xác nhận",
    None: "—",
  };
  const status = statusMap[payroll?.status] || payroll?.status || "";

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

  const rows = details.map((d, i) => {
    const net = calcNet(d);
    const att = Number(d.attendanceDays);
    const conf = d.employeeConfirmStatus || "None";
    return [
      i + 1,
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
      d.bankAccountNo || "",
      net,
      confirmMap[conf] || conf,
    ];
  });

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

  const bankHeaders = ["STT", "Nhân viên", "Mã NV", "Tên ngân hàng", "Tên tài khoản", "Số tài khoản", "Số tiền (thực nhận)", "Nội dung CK"];
  const bankRows = details.map((d, i) => [
    i + 1,
    d.employeeName || "",
    d.employeeCode || "",
    toBankAccountHolderName(d.bankName) || d.bankName || "",
    toBankAccountHolderName(d.bankAccountName) || d.bankAccountName || "",
    d.bankAccountNo || "",
    calcNet(d),
    `Luong T${payroll?.month}/${payroll?.year} ${d.employeeCode || ""}`.trim(),
  ]);
  const bankSheet = XLSX.utils.aoa_to_sheet([
    [`DANH SÁCH CHUYỂN KHOẢN — ${store} — ${period}`],
    [],
    bankHeaders,
    ...bankRows,
    [],
    ["", "", "", "", "", "TỔNG", totalNet, ""],
  ]);
  bankSheet["!cols"] = [
    { wch: 5 }, { wch: 22 }, { wch: 10 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 28 },
  ];
  bankSheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bang luong");
  XLSX.utils.book_append_sheet(wb, bankSheet, "Chuyen khoan");

  const safeStore = String(store).replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
  const fileName = `BangLuong_${safeStore}_${period}.xlsx`;
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
