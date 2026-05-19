import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, Typography, Button, Chip } from "@material-tailwind/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import {
  MobileCard, MobileListShell, MobileRow, MobileField, MobileTextInput,
  CompactFormPanel,
} from "@/components/mobile/MobileCard";

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", standardWorkHoursPerDay: "8", overtimeRateMultiplier: "1.5" });

  const load = async () => {
    setLoading(true);
    try { const res = await api.get("/stores"); setStores(res.data.data || []); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: "", address: "", phone: "", standardWorkHoursPerDay: "8", overtimeRateMultiplier: "1.5" }); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name, address: s.address || "", phone: s.phone || "",
      standardWorkHoursPerDay: String(s.standardWorkHoursPerDay ?? 8),
      overtimeRateMultiplier: String(s.overtimeRateMultiplier ?? 1.5),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      standardWorkHoursPerDay: Number(form.standardWorkHoursPerDay),
      overtimeRateMultiplier: Number(form.overtimeRateMultiplier),
    };
    try {
      if (editing) await api.put(`/stores/${editing.id}`, payload);
      else await api.post("/stores", payload);
      setShowForm(false);
      load();
    } catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  const toggleActive = async (s) => {
    try { await api.patch(`/stores/${s.id}/toggle-active`); load(); }
    catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  return (
    <div className="mt-4">
      <Card className="border border-blue-gray-100">
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Typography variant="h6" color="blue-gray">Quản lý Cửa hàng</Typography>
          <Button size="sm" className="flex items-center gap-1 w-full sm:w-auto justify-center" onClick={openCreate}>
            <PlusIcon className="w-4 h-4" /> Thêm cửa hàng
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          {/* Form */}
          {showForm && (
            <CompactFormPanel
              title={editing ? "Sửa cửa hàng" : "Thêm cửa hàng mới"}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            >
              <MobileField label="Tên cửa hàng" required className="col-span-2">
                <MobileTextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </MobileField>
              <MobileField label="Địa chỉ" className="col-span-2">
                <MobileTextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </MobileField>
              <MobileField label="SĐT">
                <MobileTextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </MobileField>
              <MobileField label="Giờ chuẩn/ngày">
                <MobileTextInput type="number" value={form.standardWorkHoursPerDay}
                  onChange={(e) => setForm({ ...form, standardWorkHoursPerDay: e.target.value })} />
              </MobileField>
              <MobileField label="Hệ số OT">
                <MobileTextInput type="number" step="0.1" value={form.overtimeRateMultiplier}
                  onChange={(e) => setForm({ ...form, overtimeRateMultiplier: e.target.value })} />
              </MobileField>
            </CompactFormPanel>
          )}
          <MobileListShell loading={loading} empty={!loading && stores.length === 0} emptyText="Chưa có cửa hàng nào" count={stores.length}>
            {stores.map((s) => (
              <MobileCard key={s.id}>
                <Typography variant="small" className="font-semibold text-blue-gray-900">{s.name}</Typography>
                <MobileRow label="Địa chỉ">{s.address || "—"}</MobileRow>
                <MobileRow label="SĐT">{s.phone || "—"}</MobileRow>
                <MobileRow label="Nhân viên">{s.employeeCount}</MobileRow>
                <MobileRow label="Trạng thái">
                  <Chip size="sm" color={s.isActive ? "green" : "gray"} value={s.isActive ? "Hoạt động" : "Tạm dừng"} className="w-fit ml-auto" />
                </MobileRow>
                <div className="flex gap-3 pt-1 border-t border-blue-gray-100">
                  <button type="button" onClick={() => openEdit(s)} className="text-xs text-blue-600 font-medium">Sửa</button>
                  <button type="button" onClick={() => toggleActive(s)} className={`text-xs font-medium ${s.isActive ? "text-red-500" : "text-green-600"}`}>
                    {s.isActive ? "Vô hiệu" : "Kích hoạt"}
                  </button>
                </div>
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2.5 text-left">Tên cửa hàng</th>
                <th className="px-4 py-2.5 text-left">Địa chỉ</th>
                <th className="px-4 py-2.5 text-left">SĐT</th>
                <th className="px-4 py-2.5 text-center">NV</th>
                <th className="px-4 py-2.5 text-center">Trạng thái</th>
                <th className="px-4 py-2.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : stores.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Chưa có cửa hàng nào</td></tr>
              ) : stores.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{s.address || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{s.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-center">{s.employeeCount}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Chip size="sm" color={s.isActive ? "green" : "gray"} value={s.isActive ? "Hoạt động" : "Tạm dừng"} className="w-fit mx-auto" />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs">Sửa</button>
                      <button onClick={() => toggleActive(s)} className={`text-xs ${s.isActive ? "text-red-500" : "text-green-600"} hover:underline`}>
                        {s.isActive ? "Vô hiệu" : "Kích hoạt"}
                      </button>
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
