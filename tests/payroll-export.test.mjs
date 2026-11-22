import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  buildPayrollWorkbook,
  buildPayrollBulkWorkbook,
  assertValidPayrollForExport,
  payrollBulkFileName,
} from "../src/utils/exportPayrollExcel.js";
import { fetchEmployeePositionMap, roleLabel } from "../src/utils/employeeHelpers.js";

let detailSeq = 0;
const detail = (o = {}) => {
  const d = {
    id: ++detailSeq,
    employeeName: "Nguyen A",
    employeeCode: "NV001",
    attendanceDays: 3,
    workedDays: 2.5,
    workedHours: 20.5,
    baseSalaryPerHour: 30000,
    salaryType: "Hourly",
    grossSalary: 615000.5,
    bonus: 100000,
    deliveryAllowance: 50000,
    allowances: [{ amount: 20000 }, { amount: 30000 }],
    deduction: 15000.25,
    note: "ghi chu",
    bankName: "Vietcombank",
    bankAccountName: "Nguyễn Văn A",
    bankAccountNo: "001234567890123456",
    employeeConfirmStatus: "Confirmed",
    ...o,
  };
  if (d.netSalary === undefined) d.netSalary = d.grossSalary + d.bonus + d.deliveryAllowance - d.deduction;
  return d;
};
const payroll = (id, month, details, o = {}) => ({ id, storeName: "CH Quan 1", month, year: 2026, status: "Draft", details, ...o });

function roundTrip(wb) {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return XLSX.read(buf, { type: "buffer" });
}
function table(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  const h = rows.findIndex((r) => r[0] === "STT");
  const body = [];
  for (let i = h + 1; i < rows.length && typeof rows[i][0] === "number"; i++) body.push(i);
  return { ws, rows, h, body };
}
const cell = (ws, r, c) => ws[XLSX.utils.encode_cell({ r, c })];
const sumCol = (t, c) => Math.round(t.body.reduce((s, r) => s + t.rows[r][c], 0) * 100) / 100;

test("một bảng: cột, kiểu cell, tổng khớp hai sheet, phụ cấp không cộng hai lần", () => {
  const d = detail();
  const wb = roundTrip(buildPayrollBulkWorkbook([payroll(7, 10, [d])], { filterLabel: "Tháng 10/2026" }));
  assert.deepEqual(wb.SheetNames, ["Bang luong", "Chuyen khoan"]);
  const a = table(wb, "Bang luong");
  const b = table(wb, "Chuyen khoan");
  assert.equal(a.body.length, 1);
  const r = a.rows[a.body[0]];
  assert.equal(r[1], 7);
  assert.equal(r[2], "CH Quan 1");
  assert.equal(r[3], "T10/2026");
  assert.equal(r[4], "Nháp");
  assert.equal(r[12], 50000); // phụ cấp = deliveryAllowance, không cộng allowances[]
  assert.equal(r[18], d.netSalary);
  assert.equal(cell(a.ws, a.body[0], 18).t, "n");
  assert.equal(cell(a.ws, a.body[0], 10).t, "n");
  const br = b.rows[b.body[0]];
  assert.equal(br[11], d.netSalary);
  assert.equal(br[12], "Luong T10/2026 NV001");
  assert.equal(sumCol(a, 18), sumCol(b, 11));
  const footerA = a.rows.find((x) => x[5] === "TỔNG");
  const footerB = b.rows.find((x) => x[10] === "TỔNG");
  assert.equal(footerA[18], footerB[11]);
  assert.equal(footerA[18], sumCol(a, 18));
  const text = JSON.stringify(a.rows.slice(0, a.h));
  assert.match(text, /Số bảng: 1/);
  assert.match(text, /Tháng 10\/2026/);
});

test("số tài khoản giữ nguyên số 0 đầu, kiểu text ở cả hai sheet", () => {
  const wb = roundTrip(buildPayrollBulkWorkbook([payroll(1, 10, [detail()])]));
  const a = table(wb, "Bang luong");
  const b = table(wb, "Chuyen khoan");
  assert.equal(a.rows[a.body[0]][17], "001234567890123456");
  assert.equal(cell(a.ws, a.body[0], 17).t, "s");
  assert.equal(b.rows[b.body[0]][10], "001234567890123456");
  assert.equal(cell(b.ws, b.body[0], 10).t, "s");
});

test("nhiều bảng/kỳ, cùng cửa hàng-kỳ hai phiên bản, một người ở hai bảng, bảng rỗng; thứ tự theo đầu vào", () => {
  const same = { employeeName: "Tran B", employeeCode: "NV002" };
  const p1 = payroll(30, 9, [detail(same), detail({ employeeName: "Le C", employeeCode: "NV003" })], { status: "Approved" });
  const p2 = payroll(12, 10, [detail(same)]);
  const p3 = payroll(13, 10, [detail(same)], { status: "Paid" }); // cùng cửa hàng/kỳ với p2
  const p4 = payroll(99, 10, [], { storeName: "CH Rong" });
  const wb = roundTrip(buildPayrollBulkWorkbook([p1, p2, p3, p4]));
  const a = table(wb, "Bang luong");
  const b = table(wb, "Chuyen khoan");
  assert.equal(a.body.length, 4);
  assert.deepEqual(a.body.map((r) => a.rows[r][1]), [30, 30, 12, 13]);
  assert.deepEqual(a.body.map((r) => a.rows[r][3]), ["T9/2026", "T9/2026", "T10/2026", "T10/2026"]);
  assert.deepEqual(a.body.map((r) => a.rows[r][4]), ["Đã duyệt", "Đã duyệt", "Nháp", "Đã trả"]);
  assert.equal(a.rows[a.body[0]][5], "Tran B (NV002)");
  assert.equal(a.rows[a.body[2]][5], "Tran B (NV002)");
  assert.equal(b.body.length, 4);
  assert.equal(sumCol(a, 18), sumCol(b, 11));
  assert.equal(sumCol(a, 18), Math.round(4 * 0 + (p1.details[0].netSalary + p1.details[1].netSalary + p2.details[0].netSalary + p3.details[0].netSalary) * 100) / 100);
  // metadata nguồn có cả bảng rỗng với số dòng 0, không có nhân viên giả
  const meta = a.rows.slice(0, a.h);
  const emptyRow = meta.find((r) => r[0] === 99);
  assert.ok(emptyRow);
  assert.equal(emptyRow[1], "CH Rong");
  assert.equal(emptyRow[4], 0);
  assert.ok(meta.find((r) => r[0] === 13));
  assert.ok(!a.body.some((r) => a.rows[r][1] === 99));
});

test("tiền thập phân vẫn là số, so sánh theo độ chính xác tiền", () => {
  const d = detail({ grossSalary: 100000.1, bonus: 0.2, deliveryAllowance: 0, deduction: 0.05, netSalary: 100000.25 });
  const wb = roundTrip(buildPayrollBulkWorkbook([payroll(1, 1, [d, detail({ grossSalary: 0.1, bonus: 0, deliveryAllowance: 0, deduction: 0, netSalary: 0.1 })])]));
  const a = table(wb, "Bang luong");
  assert.equal(cell(a.ws, a.body[0], 18).t, "n");
  assert.ok(Math.abs(a.rows[a.body[0]][18] - 100000.25) < 0.005);
  const footer = a.rows.find((x) => x[5] === "TỔNG");
  assert.equal(footer[18], 100000.35);
});

test("tên/ghi chú giống công thức là cell string, không có formula", () => {
  const evil = detail({ employeeName: "=1+1", note: "=SUM(A1:A2)", bankAccountName: "+cmd", employeeCode: "@x" });
  const wb = roundTrip(buildPayrollBulkWorkbook([payroll(1, 1, [evil])]));
  for (const name of wb.SheetNames) {
    for (const [k, c] of Object.entries(wb.Sheets[name])) {
      if (k.startsWith("!")) continue;
      assert.equal(c.f, undefined, `${name}!${k} có formula`);
    }
  }
  const a = table(wb, "Bang luong");
  assert.equal(cell(a.ws, a.body[0], 13).t, "s");
  assert.equal(a.rows[a.body[0]][13], "=SUM(A1:A2)");
});

test("không tạo workbook khi dữ liệu thiếu/lỗi hoặc rỗng toàn bộ", () => {
  assert.throws(() => buildPayrollBulkWorkbook([]), /Chưa chọn/);
  assert.throws(() => buildPayrollBulkWorkbook([payroll(1, 1, [])]), /không có chi tiết/);
  assert.throws(() => buildPayrollBulkWorkbook([payroll(1, 1, undefined)]), /thiếu danh sách chi tiết/);
  assert.throws(() => buildPayrollBulkWorkbook([payroll(1, 1, [detail({ grossSalary: "abc" })])]), /grossSalary/);
  assert.throws(() => buildPayrollBulkWorkbook([payroll(1, 1, [detail({ bonus: null })])]), /bonus/);
  assert.throws(() => buildPayrollBulkWorkbook([payroll(1, 1, [detail({ deliveryAllowance: NaN })])]), /deliveryAllowance/);
  assert.throws(() => buildPayrollBulkWorkbook([payroll(1, 1, [detail({ netSalary: 1 })])]), /netSalary/);
  const dup = detail();
  assert.throws(() => buildPayrollBulkWorkbook([payroll(1, 1, [dup, { ...dup }])]), /trùng ID chi tiết/);
  assert.throws(() => buildPayrollBulkWorkbook([payroll(1, 1, [detail()]), payroll(1, 2, [detail()])]), /Trùng ID bảng/);
  assert.throws(() => assertValidPayrollForExport(payroll(2, 1, [detail()]), 3), /ID 3/);
  assert.throws(() => assertValidPayrollForExport(payroll(2, 13, [detail()]), 2), /cửa hàng\/kỳ/);
  assert.doesNotThrow(() => assertValidPayrollForExport(payroll(2, 1, [detail({ deliveryAllowance: null, netSalary: undefined })]), 2));
});

test("tên file theo giờ máy", () => {
  assert.equal(payrollBulkFileName(3, new Date(2026, 10, 9, 8, 5, 7)), "BangLuong_ChiTiet_3Bang_20261109_080507.xlsx");
});


const BANK_HEADER_BULK = ["STT", "ID bảng lương", "Kỳ", "Trạng thái", "Nhân viên", "Mã NV", "Cửa hàng", "Chức vụ", "Tên ngân hàng", "Tên tài khoản", "Số tài khoản", "Số tiền (thực nhận)", "Nội dung CK"];
const BANK_HEADER_SINGLE = ["STT", "Nhân viên", "Mã NV", "Cửa hàng", "Chức vụ", "Tên ngân hàng", "Tên tài khoản", "Số tài khoản", "Số tiền (thực nhận)", "Nội dung CK"];

test("gộp: header Chuyen khoan có Cửa hàng/Chức vụ sau Mã NV, không trùng cột cửa hàng", () => {
  const p = payroll(5, 10, [detail({ employeeId: 11 })]);
  const wb = roundTrip(buildPayrollBulkWorkbook([p], { positions: new Map([["11", "Quản lý"]]) }));
  const b = table(wb, "Chuyen khoan");
  assert.deepEqual(b.rows[b.h], BANK_HEADER_BULK);
  assert.equal(b.rows[b.h].filter((x) => x === "Cửa hàng").length, 1);
  const r = b.rows[b.body[0]];
  assert.equal(r[6], "CH Quan 1");
  assert.equal(r[7], "Quản lý");
  assert.equal(r[5], "NV001");
  // sheet Bang luong không đổi cột
  const a = table(wb, "Bang luong");
  assert.equal(a.rows[a.h][2], "Cửa hàng");
  assert.equal(a.rows[a.h].length, 20);
});

test("chức vụ ghép theo employeeId (hồ sơ khác thứ tự), một người hai cửa hàng giữ hai dòng, thiếu hồ sơ để trống", () => {
  const A = { employeeId: 1, employeeName: "Trùng Tên", employeeCode: "N1" };
  const B = { employeeId: 2, employeeName: "Trùng Tên", employeeCode: "N2" };
  const C = { employeeId: 99, employeeName: "Không hồ sơ", employeeCode: "N9" };
  const p1 = payroll(1, 10, [detail(A), detail(B), detail(C)], { storeName: "CH Một" });
  const p2 = payroll(2, 10, [detail(A)], { storeName: "CH Hai" });
  // hồ sơ thứ tự ngược, khóa dạng số và chuỗi
  const positions = new Map([["2", "Nhân viên"], ["1", "Quản lý"]]);
  const wb = roundTrip(buildPayrollBulkWorkbook([p1, p2], { positions }));
  const a = table(wb, "Bang luong");
  const b = table(wb, "Chuyen khoan");
  const rows = b.body.map((i) => b.rows[i]);
  assert.deepEqual(rows.map((r) => [r[5], r[6], r[7]]), [
    ["N1", "CH Một", "Quản lý"],
    ["N2", "CH Một", "Nhân viên"],
    ["N9", "CH Một", ""],
    ["N1", "CH Hai", "Quản lý"],
  ]);
  assert.equal(rows.length, 4);
  assert.equal(sumCol(a, 18), sumCol(b, 11)); // thiếu hồ sơ không đổi tiền
  // không truyền positions: toàn bộ để trống, không mất dòng
  const wb2 = roundTrip(buildPayrollBulkWorkbook([p1]));
  const b2 = table(wb2, "Chuyen khoan");
  assert.deepEqual(b2.body.map((i) => b2.rows[i][7]), ["", "", ""]);
});

test("xuất đơn: header/cột mới, tài khoản text, tổng khớp, giữ giá trị đang sửa truyền vào", () => {
  const d1 = detail({ employeeId: 3, employeeCode: "NV003" });
  const d2 = detail({ employeeId: 4, employeeCode: "NV004", bankAccountNo: "0001234" });
  // giả lập ô đang sửa: caller truyền hàng đã trộn edit
  const edited = { ...d2, bonus: 777000, netSalary: undefined };
  const getNet = (d) => Number(d.grossSalary) + Number(d.bonus) + Number(d.deliveryAllowance || 0) - Number(d.deduction);
  const { wb: raw, fileName } = buildPayrollWorkbook(payroll(8, 10, [d1, edited]), [d1, edited], { getNet, positions: new Map([["3", "Quản lý"], ["4", "Nhân viên"]]) });
  assert.match(fileName, /^BangLuong_CH Quan 1_T10-2026\.xlsx$/);
  const wb = roundTrip(raw);
  const b = table(wb, "Chuyen khoan");
  assert.deepEqual(b.rows[b.h], BANK_HEADER_SINGLE);
  const r = b.rows[b.body[1]];
  assert.deepEqual([r[2], r[3], r[4]], ["NV004", "CH Quan 1", "Nhân viên"]);
  assert.equal(b.rows[b.body[0]][4], "Quản lý");
  assert.equal(r[7], "0001234");
  assert.equal(cell(b.ws, b.body[1], 7).t, "s");
  assert.equal(cell(b.ws, b.body[1], 8).t, "n");
  assert.equal(r[8], getNet(edited));
  assert.equal(r[9], "Luong T10/2026 NV004");
  const a = table(wb, "Bang luong");
  const total = Math.round(b.body.reduce((s2, i) => s2 + b.rows[i][8], 0) * 100) / 100;
  const footerB = b.rows.find((x) => x[7] === "TỔNG");
  const footerA = a.rows.find((x) => x[1] === "TỔNG");
  assert.equal(footerB[8], total);
  assert.equal(footerA[14], total);
  assert.equal(wb.Sheets["Chuyen khoan"]["!merges"][0].e.c, 9);
  // header Bang luong của xuất đơn không đổi (16 cột)
  assert.equal(a.rows[a.h].length, 16);
});

test("fetchEmployeePositionMap: chức vụ theo bậc lương khớp loại+giá trị, mơ hồ/không khớp để trống, 3 request", async () => {
  const calls = [];
  const grades = [
    { id: 1, code: "SL1", label: "Nhân viên cơ bản", value: 20000, type: "Hourly", isActive: true },
    { id: 2, code: "SL3", label: "Nhân viên cao cấp", value: 25000, type: "Hourly", isActive: true },
    { id: 3, code: "SM1", label: "Store Manager cấp 1", value: 8000000, type: "Monthly", isActive: true },
    { id: 4, code: "SL", label: "Trưởng ca", value: 6000000, type: "Monthly", isActive: false },
    { id: 5, code: "DUP-A", label: "Trùng A", value: 30000, type: "Hourly", isActive: true },
    { id: 6, code: "DUP-B", label: "Trùng B", value: 30000, type: "Hourly", isActive: true },
    { id: 7, code: "NOLABEL", label: null, value: 40000, type: "Hourly", isActive: true },
  ];
  const sal = (v, t) => ({ baseSalaryPerHour: v, salaryType: t });
  const api = {
    get: async (url) => {
      calls.push(url);
      if (url.startsWith("/config/salary-grades")) return { data: { data: grades } };
      return url.endsWith("true")
        ? { data: { data: [
            { id: 2, role: "Employee", currentSalary: sal(25000, "Hourly") },
            { id: 1, role: "Manager", currentSalary: sal(8000000, "Monthly") },
            { id: 5, role: "Employee", currentSalary: sal(30000, "Hourly") },
          ] } }
        : { data: { data: [
            { id: 7, role: "Admin", currentSalary: sal(6000000, "Monthly") }, // bậc đã ngừng dùng vẫn nhận diện
            { id: 3, role: "Employee", currentSalary: sal(20000, "Monthly") }, // giá trị trùng nhưng khác loại
            { id: 4, role: "Employee", currentSalary: null },
            { id: 6, role: "Employee", currentSalary: sal(40000, "Hourly") },
            { id: 8, role: "Employee", currentSalary: sal(21000, "Hourly") },
          ] } };
    },
  };
  const m = await fetchEmployeePositionMap(api);
  assert.equal(calls.length, 3);
  assert.deepEqual(Object.fromEntries(m), {
    1: "Store Manager cấp 1", 2: "Nhân viên cao cấp", 5: "", 7: "Trưởng ca", 3: "", 4: "", 6: "NOLABEL", 8: "",
  });
  assert.equal(roleLabel("Manager"), "Quản lý");
  await assert.rejects(() => fetchEmployeePositionMap({ get: async () => { throw new Error("net"); } }), /net/);
  await assert.rejects(() => fetchEmployeePositionMap({ get: async (u) => ({ data: u.startsWith("/config") ? {} : { data: [] } }) }), /bậc lương không hợp lệ/);
  await assert.rejects(() => fetchEmployeePositionMap({ get: async (u) => ({ data: u.startsWith("/config") ? { data: [] } : {} }) }), /nhân viên không hợp lệ/);
});
