/** Ngày 1 của tháng sau (yyyy-MM-dd). */
export function getFirstDayOfNextMonthISO(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function formatDateVi(iso) {
  if (!iso) return "";
  const [y, m, day] = iso.split("-");
  return `${day}/${m}/${y}`;
}

/** Thời gian làm việc từ startDate (yyyy-MM-dd) — admin xem xét tăng lương. */
export function formatTenureVi(startDateIso) {
  if (!startDateIso) return "—";
  const start = new Date(`${startDateIso}T12:00:00`);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} tháng`;
  if (rem === 0) return `${years} năm`;
  return `${years} năm ${rem} tháng`;
}
