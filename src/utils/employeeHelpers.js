export const EDUCATION_LEVEL_OPTIONS = [
  { value: "THPT",       label: "THPT (Lớp 12)" },
  { value: "CaoDang",    label: "Cao đẳng" },
  { value: "DaiHoc",     label: "Đại học" },
  { value: "DaoTaoNghe", label: "Đào tạo nghề" },
];

export function educationLevelLabel(value) {
  if (!value) return "—";
  return EDUCATION_LEVEL_OPTIONS.find(o => o.value === value)?.label ?? "—";
}

/** Nhãn chức vụ hiển thị ở danh sách nhân viên (theo role tài khoản). */
export function roleLabel(role) {
  if (role === "Manager") return "Quản lý";
  if (role === "Admin") return "Admin";
  return "Nhân viên";
}

/**
 * Map employeeId -> chức vụ theo bậc lương có sẵn (Config > Bậc lương, GET /config/salary-grades).
 * BE không lưu bậc theo nhân viên, nên bậc = bậc lương DUY NHẤT trùng đúng loại (Hourly/Monthly) và
 * giá trị với currentSalary của hồ sơ (GET /employees). Không có bậc trùng, hoặc trùng nhiều bậc
 * (mơ hồ) thì để trống, không đoán. Nhãn = tên mô tả của bậc (fallback mã bậc).
 * Gọi 4 request cho cả lượt xuất: NV active, NV đã nghỉ (Manager mặc định chỉ thấy active), bậc lương; không gọi theo dòng.
 * Lỗi mạng/phản hồi sai thì throw, không trả map thiếu.
 */
export async function fetchEmployeePositionMap(api, { signal } = {}) {
  const [active, inactive, gradesRes] = await Promise.all([
    api.get("/employees?isActive=true", { signal }),
    api.get("/employees?isActive=false", { signal }),
    api.get("/config/salary-grades", { signal }),
  ]);
  const grades = gradesRes?.data?.data;
  if (!Array.isArray(grades)) throw new Error("Phản hồi danh sách bậc lương không hợp lệ");
  const typeOf = (t) => (String(t || "").toLowerCase() === "monthly" ? "Monthly" : "Hourly");
  const map = new Map();
  for (const res of [active, inactive]) {
    const list = res?.data?.data;
    if (!Array.isArray(list)) throw new Error("Phản hồi danh sách nhân viên không hợp lệ");
    for (const e of list) {
      if (e?.id == null) continue;
      const cs = e.currentSalary;
      const rate = Number(cs?.baseSalaryPerHour ?? cs?.baseSalaryPerDay);
      const matches = cs && Number.isFinite(rate)
        ? grades.filter((g) => typeOf(g.type) === typeOf(cs.salaryType) && Number(g.value) === rate)
        : [];
      map.set(String(e.id), matches.length === 1 ? (matches[0].label || matches[0].code || "") : "");
    }
  }
  return map;
}
