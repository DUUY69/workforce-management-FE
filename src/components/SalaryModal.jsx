import { useEffect, useState } from "react";
import { Typography, Button, Chip } from "@material-tailwind/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { MobileField, MobileTextInput } from "@/components/mobile/MobileCard";
import { formatHourlyRate, getHourlyRate } from "@/utils/formatMoney";
import { formatDateVi, getFirstDayOfNextMonthISO } from "@/utils/dates";

function roleBadge(role) {
  if (role === "Admin") return "Admin";
  if (role === "Manager") return "Quản lý";
  return "Hệ thống";
}

export default function SalaryModal({ open, employee, canEdit, onClose, onSaved }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ baseSalaryPerHour: "", coefficient: "1.0", note: "" });

  const employeeId = employee?.id;

  useEffect(() => {
    if (!open || !employeeId) return;
    const current = getHourlyRate(employee?.currentSalary);
    setForm({
      baseSalaryPerHour: current != null ? String(current) : "",
      coefficient: employee?.currentSalary?.coefficient != null
        ? String(employee.currentSalary.coefficient)
        : "1.0",
      note: "",
    });

    const load = async () => {
      setLoading(true);
      try {
        const url = canEdit && employee
          ? `/employees/${employeeId}/salary-history`
          : "/employees/me/salary-history";
        const res = await api.get(url);
        setHistory(res.data.data || []);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, employeeId, canEdit, employee]);

  if (!open || !employee) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/employees/${employeeId}/salary-coefficients`, {
        employeeId,
        baseSalaryPerHour: Number(form.baseSalaryPerHour),
        coefficient: Number(form.coefficient),
        note: form.note,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      alert(e?.response?.data?.message || "Lỗi lưu hệ số lương");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Đóng" />
      <div className="relative bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-2xl sm:rounded-xl shadow-xl flex flex-col">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      <span className="font-medium text-blue-gray-900">
                        {formatHourlyRate(row)} · ×{row.coefficient}
                      </span>
                      {idx === 0 && (
                        <Chip size="sm" value="Hiện tại" color="blue" className="normal-case shrink-0" />
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

          {canEdit && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
              <Typography variant="small" className="font-semibold text-blue-gray-900">
                Thêm hệ số mới
              </Typography>
              <p className="text-xs text-blue-gray-600">
                Áp dụng từ <strong>{formatDateVi(getFirstDayOfNextMonthISO())}</strong> (ngày 1 tháng sau)
              </p>
              <MobileField label="Lương cơ bản/giờ" required>
                <MobileTextInput
                  type="number"
                  value={form.baseSalaryPerHour}
                  onChange={(e) => setForm({ ...form, baseSalaryPerHour: e.target.value })}
                  placeholder="VD: 40000"
                />
              </MobileField>
              <MobileField label="Hệ số" required>
                <MobileTextInput
                  type="number"
                  step="0.1"
                  value={form.coefficient}
                  onChange={(e) => setForm({ ...form, coefficient: e.target.value })}
                />
              </MobileField>
              <MobileField label="Lý do / ghi chú">
                <MobileTextInput
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Lý do tăng lương..."
                />
              </MobileField>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-blue-gray-100 flex gap-2 justify-end">
          <Button variant="outlined" size="sm" onClick={onClose}>Đóng</Button>
          {canEdit && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu hệ số"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

