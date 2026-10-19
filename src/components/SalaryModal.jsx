import { useEffect, useState, useMemo } from "react";
import { Typography, Button, Chip } from "@material-tailwind/react";
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { MobileField, MobileTextInput, MobileSelect } from "@/components/mobile/MobileCard";
import { formatHourlyRate, formatMoney, getHourlyRate, formatAmountInput, formatAmount, numberFromAmountInput } from "@/utils/formatMoney";
import { useAuth } from "@/context/AuthContext";
import { formatDateVi, fromMonthInputValue, getFirstDayOfCurrentMonthISO, getFirstDayOfNextMonthISO, toMonthInputValue } from "@/utils/dates";

const STATUS_LABELS = { Draft: "Nháp", Approved: "Đã duyệt", Paid: "Đã trả" };
const STATUS_COLORS = { Draft: "gray", Approved: "blue", Paid: "green" };

function roleBadge(role) {
  if (role === "Admin") return "Admin";
  if (role === "Manager") return "Quản lý";
  return "Hệ thống";
}

export default function SalaryModal({ open, employee, canEdit, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin";
  const [history, setHistory] = useState([]);
  const [payrollSummary, setPayrollSummary] = useState([]);
  const [salaryGrades, setSalaryGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("history"); // "history" | "payroll"

  const [form, setForm] = useState({
    editId: null,
    salaryGradeId: "",
    baseSalaryPerHour: "",
    salaryType: "Hourly",
    coefficient: "1.0",
    note: "",
    effectiveFrom: getFirstDayOfCurrentMonthISO(),
  });

  const employeeId = employee?.id;

  // Selected grade object
  const selectedGrade = useMemo(
    () => salaryGrades.find((g) => String(g.id) === String(form.salaryGradeId)) || null,
    [salaryGrades, form.salaryGradeId]
  );

  useEffect(() => {
    if (!open || !employeeId) return;

    const current = getHourlyRate(employee?.currentSalary);
    setForm({
      editId: null,
      salaryGradeId: "",
      baseSalaryPerHour: current != null ? formatAmount(current) : "",
      salaryType: employee?.currentSalary?.salaryType || "Hourly",
      coefficient: employee?.currentSalary?.coefficient != null
        ? String(employee.currentSalary.coefficient)
        : "1.0",
      note: "",
      effectiveFrom: isAdmin ? getFirstDayOfCurrentMonthISO() : getFirstDayOfNextMonthISO(),
    });

    const load = async () => {
      setLoading(true);
      try {
        const [histRes, gradeRes, payrollRes] = await Promise.all([
          api.get(canEdit && employee
            ? `/employees/${employeeId}/salary-history`
            : "/employees/me/salary-history"),
          canEdit ? api.get("/config/salary-grades") : Promise.resolve(null),
          api.get(canEdit && employee
            ? `/employees/${employeeId}/payroll-summary`
            : "/employees/me/payroll-summary"),
        ]);
        setHistory(histRes.data.data || []);
        setSalaryGrades(gradeRes?.data?.data?.filter((g) => g.isActive) || []);
        setPayrollSummary(payrollRes.data.data || []);
      } catch {
        setHistory([]);
        setSalaryGrades([]);
        setPayrollSummary([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, employeeId, canEdit, employee]);

  if (!open || !employee) return null;

  // When a grade is selected → auto-fill baseSalaryPerHour
  const handleGradeChange = (e) => {
    const gradeId = e.target.value;
    const grade = salaryGrades.find((g) => String(g.id) === gradeId);
    setForm((f) => ({
      ...f,
      salaryGradeId: gradeId,
      baseSalaryPerHour: grade ? formatAmount(grade.value) : f.baseSalaryPerHour,
      salaryType: grade ? grade.type : f.salaryType,
    }));
  };

  const startEditSalary = (row) => {
    setForm((f) => ({
      ...f,
      editId: row.id,
      salaryGradeId: "__custom__",
      baseSalaryPerHour: row.baseSalaryPerHour != null ? formatAmount(row.baseSalaryPerHour) : "",
      salaryType: row.salaryType || "Hourly",
      coefficient: row.coefficient != null ? String(row.coefficient) : "1.0",
      note: row.note || "",
      effectiveFrom: row.effectiveFrom?.slice?.(0, 10) || getFirstDayOfCurrentMonthISO(),
    }));
    setActiveTab("history");
  };

  const handleSave = async () => {
    const amount = selectedGrade
      ? Number(selectedGrade.value)
      : numberFromAmountInput(form.baseSalaryPerHour);
    if (!amount || amount <= 0) {
      alert("Vui lòng chọn bậc lương hoặc nhập mức lương lớn hơn 0.");
      return;
    }
    const effectiveFrom = isAdmin
      ? (form.effectiveFrom || getFirstDayOfCurrentMonthISO())
      : getFirstDayOfNextMonthISO();

    const payload = {
      employeeId,
      baseSalaryPerHour: amount,
      salaryType: selectedGrade?.type || form.salaryType || "Hourly",
      coefficient: Number(form.coefficient) || 1,
      note: form.note,
      effectiveFrom,
      salaryGradeId: form.salaryGradeId && form.salaryGradeId !== "__custom__"
        ? Number(form.salaryGradeId)
        : null,
    };

    setSaving(true);
    try {
      const res = form.editId
        ? await api.put(`/employees/${employeeId}/salary-coefficients/${form.editId}`, payload)
        : await api.post(`/employees/${employeeId}/salary-coefficients`, payload);
      onSaved?.();
      alert(res?.data?.message || "Đã lưu hệ số lương. Nếu sửa tháng đã có bảng lương, hãy tạo lại bảng lương tháng đó.");
      onClose();
    } catch (e) {
      alert(e?.response?.data?.message || "Lỗi lưu hệ số lương");
    } finally {
      setSaving(false);
    }
  };

  // Payroll summary totals
  const totalHours = payrollSummary.reduce((s, r) => s + Number(r.workedHours), 0);
  const totalNet = payrollSummary.reduce((s, r) => s + Number(r.netSalary), 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Đóng" />
      <div className="relative bg-white w-full sm:max-w-xl max-h-[92vh] rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-blue-gray-100">
          <div>
            <Typography variant="h6" color="blue-gray" className="text-base sm:text-lg">
              {canEdit ? "Hệ số & lịch sử lương" : "Lịch sử lương của tôi"}
            </Typography>
            <Typography variant="small" color="gray" className="mt-0.5">
              {employee.fullName} · {employee.employeeCode}
            </Typography>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-blue-gray-50">
            <XMarkIcon className="w-5 h-5 text-blue-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-blue-gray-100 px-4 pt-2 gap-4">
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-blue-gray-500 hover:text-blue-gray-700"}`}
          >
            Lịch sử lương
          </button>
          <button
            onClick={() => setActiveTab("payroll")}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "payroll" ? "border-blue-600 text-blue-600" : "border-transparent text-blue-gray-500 hover:text-blue-gray-700"}`}
          >
            Giờ làm &amp; thu nhập
            {payrollSummary.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">{payrollSummary.length}</span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── Tab: Salary history ─────────────────────────────────────────── */}
          {activeTab === "history" && (<>
            <div>
              <Typography variant="small" className="font-semibold text-blue-gray-800 mb-2">
                Lịch sử cập nhật
              </Typography>
              {loading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Đang tải...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Chưa có lịch sử lương</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((row, idx) => (
                    <li
                      key={row.id}
                      className={`rounded-lg border px-3 py-2.5 text-sm ${
                        idx === 0 ? "border-blue-200 bg-blue-50/60" : "border-blue-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="font-medium text-blue-gray-900">
                            {row.salaryType === "Monthly"
                              ? `${Number(row.baseSalaryPerHour).toLocaleString("en-US")} đ/tháng`
                              : formatHourlyRate(row)}
                          </span>
                          {row.salaryType === "Monthly" && (
                            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded">Tháng</span>
                          )}
                          {idx === 0 && (
                            <Chip size="sm" value="Hiện tại" color="blue" className="normal-case shrink-0" />
                          )}
                        </div>
                        {isAdmin && canEdit && (
                          <button
                            type="button"
                            onClick={() => startEditSalary(row)}
                            className="shrink-0 text-xs font-semibold text-blue-700 hover:underline"
                          >
                            Sửa
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-blue-gray-600">
                        Áp dụng từ {formatDateVi(row.effectiveFrom)}
                        {row.createdAt ? ` · Ghi nhận ${row.createdAt}` : ""}
                      </p>
                      {row.note && (
                        <p className="text-xs text-blue-gray-700 mt-1">
                          <span className="font-medium">Lý do:</span> {row.note}
                        </p>
                      )}
                      {canEdit && row.createdByName && (
                        <p className="text-xs text-blue-gray-500 mt-1">
                          Cập nhật bởi {row.createdByName}
                          {row.createdByRole ? ` (${roleBadge(row.createdByRole)})` : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!canEdit && history.length > 0 && (
                <p className="text-xs text-blue-gray-500 mt-2 italic">
                  Bạn chỉ xem được mức lương theo thời gian, không hiển thị người duyệt điều chỉnh.
                </p>
              )}
            </div>

            {/* Update form */}
            {canEdit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Typography variant="small" className="font-semibold text-blue-gray-900">
                    {form.editId ? "Sửa bậc lương" : "Cập nhật bậc lương"}
                  </Typography>
                  {form.editId && (
                    <button
                      type="button"
                      className="text-xs text-blue-gray-500 hover:underline"
                      onClick={() => setForm((f) => ({
                        ...f,
                        editId: null,
                        salaryGradeId: "",
                        note: "",
                        effectiveFrom: isAdmin ? getFirstDayOfCurrentMonthISO() : getFirstDayOfNextMonthISO(),
                      }))}
                    >
                      Hủy sửa
                    </button>
                  )}
                </div>
                {isAdmin ? (
                  <MobileField label="Tháng áp dụng" required>
                    <MobileTextInput
                      type="month"
                      value={toMonthInputValue(form.effectiveFrom)}
                      onChange={(e) => setForm({
                        ...form,
                        effectiveFrom: fromMonthInputValue(e.target.value),
                      })}
                    />
                    <p className="text-[11px] text-blue-gray-500 mt-1">
                      Admin có thể chọn tháng quá khứ để sửa sai sót.
                    </p>
                  </MobileField>
                ) : (
                  <p className="text-xs text-blue-gray-600">
                    Áp dụng từ <strong>{formatDateVi(getFirstDayOfNextMonthISO())}</strong> (ngày 1 tháng sau).
                  </p>
                )}

                <MobileField label="Bậc lương" required>
                  <MobileSelect value={form.salaryGradeId} onChange={handleGradeChange}>
                    <option value="">— Chọn bậc lương —</option>
                    {salaryGrades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code}{g.label ? ` · ${g.label}` : ""} — {Number(g.value).toLocaleString("en-US")} đ{g.type === "Hourly" ? "/giờ" : "/tháng"}
                      </option>
                    ))}
                    <option value="__custom__">✏️ Nhập tay...</option>
                  </MobileSelect>
                </MobileField>

                {selectedGrade && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
                    <span className="font-bold text-blue-800">{selectedGrade.code}</span>
                    {selectedGrade.label && <span className="text-blue-gray-600 ml-1">— {selectedGrade.label}</span>}
                    <span className="ml-2 text-blue-700 font-semibold">
                      {Number(selectedGrade.value).toLocaleString("en-US")} đ{selectedGrade.type === "Hourly" ? "/giờ" : "/tháng"}
                    </span>
                  </div>
                )}

                {(form.salaryGradeId === "__custom__" || salaryGrades.length === 0) && (
                  <>
                    <MobileField label="Loại lương" required>
                      <MobileSelect
                        value={form.salaryType}
                        onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
                      >
                        <option value="Monthly">Theo tháng (đ/tháng)</option>
                        <option value="Hourly">Theo giờ (đ/giờ)</option>
                      </MobileSelect>
                    </MobileField>
                    <MobileField
                      label={form.salaryType === "Monthly" ? "Lương cơ bản/tháng" : "Lương cơ bản/giờ"}
                      required
                    >
                      <MobileTextInput
                        inputMode="numeric"
                        value={form.baseSalaryPerHour}
                        onChange={(e) => setForm({ ...form, baseSalaryPerHour: formatAmountInput(e.target.value) })}
                        placeholder={form.salaryType === "Monthly" ? "VD: 6,000,000" : "VD: 40,000"}
                      />
                    </MobileField>
                  </>
                )}

                <MobileField label="Lý do / ghi chú">
                  <MobileTextInput
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Lý do tăng lương..."
                  />
                </MobileField>
              </div>
            )}
          </>)}

          {/* ── Tab: Payroll / hours ────────────────────────────────────────── */}
          {activeTab === "payroll" && (
            <div>
              {loading ? (
                <p className="text-sm text-gray-400 py-8 text-center">Đang tải...</p>
              ) : payrollSummary.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">Chưa có dữ liệu bảng lương</p>
              ) : (<>
                {/* Summary totals */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                    <div className="text-xl font-bold text-blue-700">{totalHours.toLocaleString("en-US", { maximumFractionDigits: 1 })}h</div>
                    <div className="text-xs text-blue-gray-500 mt-0.5">Tổng giờ làm</div>
                  </div>
                  <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                    <div className="text-xl font-bold text-green-700">{formatMoney(totalNet)}</div>
                    <div className="text-xs text-blue-gray-500 mt-0.5">Tổng thực nhận</div>
                  </div>
                </div>

                {/* Per-month table */}
                <div className="overflow-x-auto rounded-xl border border-blue-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="px-3 py-2 text-left">Kỳ</th>
                        <th className="px-3 py-2 text-left">Cửa hàng</th>
                        <th className="px-3 py-2 text-center">Ngày</th>
                        <th className="px-3 py-2 text-center">Giờ</th>
                        <th className="px-3 py-2 text-right">Thực nhận</th>
                        <th className="px-3 py-2 text-center">TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollSummary.map((r, i) => (
                        <tr key={r.payrollId} className={i % 2 === 0 ? "bg-white" : "bg-blue-gray-50/40"}>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">T{r.month}/{r.year}</td>
                          <td className="px-3 py-2 text-blue-gray-600 max-w-[100px] truncate">{r.storeName}</td>
                          <td className="px-3 py-2 text-center">{Number(r.workedDays).toLocaleString("en-US", { maximumFractionDigits: 1 })}</td>
                          <td className="px-3 py-2 text-center font-medium">
                            {Number(r.workedHours).toLocaleString("en-US", { maximumFractionDigits: 1 })}h
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-green-700 whitespace-nowrap">
                            {Number(r.netSalary).toLocaleString("en-US")} đ
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Chip
                              size="sm"
                              color={STATUS_COLORS[r.status] || "gray"}
                              value={STATUS_LABELS[r.status] || r.status}
                              className="normal-case w-fit mx-auto"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-blue-gray-100 flex gap-2 justify-end">
          <Button variant="outlined" size="sm" onClick={onClose}>Đóng</Button>
          {canEdit && activeTab === "history" && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || (!form.baseSalaryPerHour && !selectedGrade)}
            >
              {saving ? "Đang lưu..." : (form.editId ? "Lưu sửa bậc lương" : "Lưu bậc lương")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
