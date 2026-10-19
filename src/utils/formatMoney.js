/** Chuỗi số tiền: 3000 → "3,000" (dấu phẩy hàng nghìn). */
export function formatAmount(amount, { digits = 0 } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Hiển thị tiền kèm đơn vị: 3000 → "3,000 đ". */
export function formatMoney(amount) {
  const s = formatAmount(amount);
  return s === "—" ? "—" : `${s} đ`;
}

/** Bỏ dấu phẩy / khoảng trắng / chữ → chỉ còn chữ số (và dấu -). */
export function parseAmountInput(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  const neg = s.startsWith("-");
  const digits = s.replace(/\D/g, "");
  if (digits === "") return neg ? "-" : "";
  return neg ? `-${digits}` : digits;
}

/** Format ô nhập tiền khi gõ: 1400000 → 1,400,000 (chỉ số, không chữ). */
export function formatAmountInput(raw) {
  const cleaned = parseAmountInput(raw);
  if (cleaned === "" || cleaned === "-") return cleaned;
  const neg = cleaned.startsWith("-");
  const digits = (neg ? cleaned.slice(1) : cleaned).replace(/\D/g, "");
  if (digits === "") return neg ? "-" : "";
  const normalized = digits.replace(/^0+(?=\d)/, "") || "0";
  const intFmt = normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return neg ? `-${intFmt}` : intFmt;
}

/** Parse ô tiền → Number (NaN nếu trống/invalid). */
export function numberFromAmountInput(raw) {
  const cleaned = parseAmountInput(raw);
  if (cleaned === "" || cleaned === "-") return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Lấy đơn giá từ currentSalary (hỗ trợ tên field cũ baseSalaryPerDay). */
export function getHourlyRate(salary) {
  if (!salary || typeof salary !== "object") return null;
  const raw = salary.baseSalaryPerHour ?? salary.baseSalaryPerDay;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** true nếu lương theo tháng (Monthly). */
export function isMonthlySalary(salary) {
  if (!salary || typeof salary !== "object") return false;
  const t = String(salary.salaryType || "").toLowerCase();
  if (t === "monthly") return true;
  if (t === "hourly") return false;
  const n = getHourlyRate(salary);
  return n != null && n >= 1_000_000;
}

/** Hiển thị mức lương: Monthly → đ/tháng, Hourly → đ/giờ. */
export function formatHourlyRate(salary) {
  const n = getHourlyRate(salary);
  if (n == null) return "—";
  const unit = isMonthlySalary(salary) ? "đ/tháng" : "đ/giờ";
  return `${formatAmount(n)} ${unit}`;
}

/** Nhãn loại lương ngắn: "Tháng" | "Giờ". */
export function salaryTypeLabel(salary) {
  if (!salary || getHourlyRate(salary) == null) return "";
  return isMonthlySalary(salary) ? "Tháng" : "Giờ";
}

/** Tách giờ thập phân → { h, m } (phút 0–59). */
export function splitHoursMinutes(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n) || n < 0) return { h: 0, m: 0 };
  const totalMin = Math.round(n * 60);
  return { h: Math.floor(totalMin / 60), m: totalMin % 60 };
}

/**
 * Giờ công dạng 103h55p (2 chữ số phút).
 * Cùng quy ước BE: giờ = (tổng phút nguyên) / 60 — hiện đúng phút đã tính lương.
 */
export function formatHoursMinutes(hours) {
  const n = Number(hours);
  if (!Number.isFinite(n) || n < 0) return "—";
  const { h, m } = splitHoursMinutes(n);
  return `${h}h${String(m).padStart(2, "0")}p`;
}

/** Ghép giờ + phút → giờ thập phân (đúng phút / 60). */
export function hoursFromParts(hoursPart, minutesPart) {
  let h = Math.max(0, Math.floor(Number(hoursPart) || 0));
  let m = Math.max(0, Math.floor(Number(minutesPart) || 0));
  if (m >= 60) {
    h += Math.floor(m / 60);
    m %= 60;
  }
  return (h * 60 + m) / 60;
}

/**
 * Tên chủ TK ngân hàng: chữ HOA, không dấu (VD: Dương Thành Phát → DUONG THANH PHAT).
 */
export function toBankAccountHolderName(raw) {
  if (raw == null) return "";
  const s = String(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
  return s
    .replace(/[^a-zA-Z0-9\s./'-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
