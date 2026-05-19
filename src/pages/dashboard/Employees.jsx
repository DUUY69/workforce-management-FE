import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, Typography, Button, Chip } from "@material-tailwind/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import {
  MobileCard, MobileListShell, MobileRow, MobileField, MobileTextInput, MobileSelect,
  CompactFormPanel,
} from "@/components/mobile/MobileCard";
import SalaryModal from "@/components/SalaryModal";
import BankInfoModal, { formatBankLine } from "@/components/BankInfoModal";
import { formatHourlyRate } from "@/utils/formatMoney";
import { formatDateVi, formatTenureVi } from "@/utils/dates";

function roleLabel(role) {
  if (role === "Manager") return "Quản lý";
  if (role === "Admin") return "Admin";
  return "Nhân viên";
}

export default function Employees() {
  const { isAdmin, isManager } = useAuth();
  const canManageSalary = isAdmin || isManager;
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [salaryModalEmp, setSalaryModalEmp] = useState(null);
  const [bankModalEmp, setBankModalEmp] = useState(null);
  const [form, setForm] = useState({
    fullName: "", email: "", username: "", password: "", role: "Employee",
    phone: "", startDate: "", storeIds: [], baseSalaryPerHour: "", coefficient: "1.0",
    bankAccountNo: "", bankName: "", bankAccountName: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, storeRes] = await Promise.all([api.get("/employees"), api.get("/stores")]);
      setEmployees(empRes.data.data || []);
      setStores(storeRes.data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await api.post("/employees", {
        ...form,
        storeIds: form.storeIds.map(Number),
        baseSalaryPerHour: form.baseSalaryPerHour ? Number(form.baseSalaryPerHour) : undefined,
        coefficient: Number(form.coefficient),
      });
      setShowForm(false);
      load();
    } catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  const toggleActive = async (emp) => {
    try { await api.patch(`/employees/${emp.id}/toggle-active`); load(); }
    catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  return (
    <div className="mt-4">
      <SalaryModal
        open={!!salaryModalEmp}
        employee={salaryModalEmp}
        canEdit={canManageSalary}
        onClose={() => setSalaryModalEmp(null)}
        onSaved={load}
      />
      <BankInfoModal
        open={!!bankModalEmp}
        employee={bankModalEmp}
        canEdit={isAdmin || isManager}
        onClose={() => setBankModalEmp(null)}
        onSaved={load}
      />

      <Card className="border border-blue-gray-100">
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Typography variant="h6" color="blue-gray">Quản lý Nhân viên</Typography>
          {isAdmin && (
            <Button size="sm" className="flex items-center gap-1 w-full sm:w-auto justify-center" onClick={() => setShowForm(!showForm)}>
              <PlusIcon className="w-4 h-4" /> Thêm nhân viên
            </Button>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {showForm && isAdmin && (
            <CompactFormPanel title="Thêm nhân viên mới" onSave={handleCreate} onCancel={() => setShowForm(false)}>
              <MobileField label="Họ tên" required>
                <MobileTextInput value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </MobileField>
              <MobileField label="Username" required>
                <MobileTextInput value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </MobileField>
              <MobileField label="Email" required>
                <MobileTextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </MobileField>
              <MobileField label="Mật khẩu" required>
                <MobileTextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </MobileField>
              <MobileField label="SĐT">
                <MobileTextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </MobileField>
              <MobileField label="Tên ngân hàng">
                <MobileTextInput value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </MobileField>
              <MobileField label="Số TK">
                <MobileTextInput value={form.bankAccountNo} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} />
              </MobileField>
              <MobileField label="Tên chủ TK">
                <MobileTextInput value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} placeholder={form.fullName || "Họ tên không dấu"} />
              </MobileField>
              <MobileField label="Ngày vào làm" required>
                <MobileTextInput type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </MobileField>
              <MobileField label="Lương/giờ">
                <MobileTextInput type="number" value={form.baseSalaryPerHour} onChange={(e) => setForm({ ...form, baseSalaryPerHour: e.target.value })} />
              </MobileField>
              <MobileField label="Hệ số">
                <MobileTextInput type="number" step="0.1" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} />
              </MobileField>
              <MobileField label="Vai trò">
                <MobileSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="Employee">Nhân viên</option>
                  <option value="Manager">Quản lý</option>
                </MobileSelect>
              </MobileField>
              <MobileField label="Cửa hàng" className="col-span-2 sm:col-span-3">
                <MobileSelect multiple value={form.storeIds.map(String)}
                  onChange={(e) => setForm({ ...form, storeIds: Array.from(e.target.selectedOptions, (o) => o.value) })}>
                  {stores.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </MobileSelect>
              </MobileField>
            </CompactFormPanel>
          )}

          <MobileListShell loading={loading} empty={!loading && employees.length === 0} emptyText="Chưa có nhân viên" count={employees.length}>
            {employees.map((emp) => (
              <MobileCard key={emp.id}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <Typography variant="small" className="font-semibold text-blue-gray-900">{emp.fullName}</Typography>
                    <Typography variant="small" color="gray" className="font-mono text-xs mt-0.5">{emp.employeeCode}</Typography>
                  </div>
                  <Chip size="sm" color={emp.isActive ? "green" : "gray"} value={emp.isActive ? "Đang làm" : "Nghỉ"} className="shrink-0 normal-case" />
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 space-y-1.5">
                  <MobileRow label="Vào làm">{emp.startDate ? formatDateVi(emp.startDate) : "—"}</MobileRow>
                  <MobileRow label="Thâm niên"><span className="text-blue-800">{formatTenureVi(emp.startDate)}</span></MobileRow>
                </div>
                <MobileRow label="Vai trò">
                  <Chip size="sm" color={emp.role === "Manager" ? "blue" : "gray"} value={roleLabel(emp.role)} className="normal-case" />
                </MobileRow>
                <MobileRow label="SĐT">{emp.phone || "—"}</MobileRow>
                <MobileRow label="Cửa hàng"><span className="text-xs font-normal text-right">{emp.storeNames?.join(", ") || "—"}</span></MobileRow>
                <MobileRow label="Lương/giờ">{formatHourlyRate(emp.currentSalary)}</MobileRow>
                <MobileRow label="Hệ số">{emp.currentSalary?.coefficient != null ? `×${emp.currentSalary.coefficient}` : "—"}</MobileRow>
                <MobileRow label="Ngân hàng"><span className="text-xs text-right">{formatBankLine(emp)}</span></MobileRow>
                {(canManageSalary || isAdmin || isManager) && (
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-blue-gray-100">
                    <button type="button" onClick={() => setBankModalEmp(emp)}
                      className="text-xs text-indigo-600 font-medium">STK ngân hàng</button>
                    {canManageSalary && (
                      <button type="button" onClick={() => setSalaryModalEmp(emp)}
                        className="text-xs text-blue-600 font-medium">Lương & lịch sử</button>
                    )}
                    {isAdmin && (
                      <button type="button" onClick={() => toggleActive(emp)}
                        className={`text-xs font-medium ${emp.isActive ? "text-red-500" : "text-green-600"}`}>
                        {emp.isActive ? "Vô hiệu" : "Kích hoạt"}
                      </button>
                    )}
                  </div>
                )}
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-2.5 text-left">Mã NV</th>
                  <th className="px-4 py-2.5 text-left">Họ tên</th>
                  <th className="px-4 py-2.5 text-left">Vào làm</th>
                  <th className="px-4 py-2.5 text-left">Thâm niên</th>
                  <th className="px-4 py-2.5 text-left">SĐT</th>
                  <th className="px-4 py-2.5 text-left">Vai trò</th>
                  <th className="px-4 py-2.5 text-left">Cửa hàng</th>
                  <th className="px-4 py-2.5 text-right">Lương/giờ</th>
                  <th className="px-4 py-2.5 text-center">Hệ số</th>
                  <th className="px-4 py-2.5 text-left">Ngân hàng / STK</th>
                  <th className="px-4 py-2.5 text-center">Trạng thái</th>
                  <th className="px-4 py-2.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="py-10 text-center text-gray-400">Đang tải...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={12} className="py-10 text-center text-gray-400">Chưa có nhân viên</td></tr>
                ) : employees.map((emp, i) => (
                  <tr key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                    <td className="px-4 py-2.5 font-mono text-xs">{emp.employeeCode}</td>
                    <td className="px-4 py-2.5 font-medium">{emp.fullName}</td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{emp.startDate ? formatDateVi(emp.startDate) : "—"}</td>
                    <td className="px-4 py-2.5 text-blue-800 font-medium whitespace-nowrap">{formatTenureVi(emp.startDate)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{emp.phone || "—"}</td>
                    <td className="px-4 py-2.5">
                      <Chip size="sm" color={emp.role === "Admin" ? "red" : emp.role === "Manager" ? "blue" : "gray"}
                        value={roleLabel(emp.role)} className="w-fit" />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{emp.storeNames?.join(", ") || "—"}</td>
                    <td className="px-4 py-2.5 text-right">{formatHourlyRate(emp.currentSalary)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-700">
                      {emp.currentSalary?.coefficient != null ? `×${emp.currentSalary.coefficient}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[200px]">{formatBankLine(emp)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Chip size="sm" color={emp.isActive ? "green" : "gray"} value={emp.isActive ? "Đang làm" : "Nghỉ"} className="w-fit mx-auto" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button type="button" onClick={() => setBankModalEmp(emp)}
                          className="text-xs text-indigo-600 hover:underline">STK</button>
                        {canManageSalary && (
                          <button type="button" onClick={() => setSalaryModalEmp(emp)}
                            className="text-xs text-blue-600 hover:underline">Lương & lịch sử</button>
                        )}
                        {isAdmin && (
                          <button type="button" onClick={() => toggleActive(emp)}
                            className={`text-xs ${emp.isActive ? "text-red-500" : "text-green-600"} hover:underline`}>
                            {emp.isActive ? "Vô hiệu" : "Kích hoạt"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
