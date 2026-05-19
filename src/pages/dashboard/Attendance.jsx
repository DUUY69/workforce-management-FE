import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardBody, Typography, Button, Input, Chip } from "@material-tailwind/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { MobileCard, MobileListShell, MobileRow } from "@/components/mobile/MobileCard";

const statusColors = { Worked: "green", Absent: "red" };

export default function Attendance() {
  const { isAdmin, isManager, isEmployee } = useAuth();
  const canManage = isAdmin || isManager;
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAbsentForm, setShowAbsentForm] = useState(false);
  const [workContext, setWorkContext] = useState(null);
  const [form, setForm] = useState({
    employeeId: "", storeId: "", workDate: new Date().toISOString().slice(0, 10),
    checkIn: "", checkOut: "", note: "",
  });
  const [absentForm, setAbsentForm] = useState({
    employeeId: "", storeId: "", workDate: new Date().toISOString().slice(0, 10), note: "",
  });
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStore, setFilterStore] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) { params.set("dateFrom", filterDate); params.set("dateTo", filterDate); }
      if (filterStore) params.set("storeId", filterStore);
      const reqs = [
        api.get(`/attendance?${params}`),
        canManage ? api.get("/employees?isActive=true") : Promise.resolve({ data: { data: [] } }),
        canManage ? api.get(isAdmin ? "/stores" : "/stores/assigned") : Promise.resolve({ data: { data: [] } }),
      ];
      const results = await Promise.all(reqs);
      setRecords(results[0].data.data || []);
      setEmployees(results[1].data.data || []);
      setStores(results[2].data.data || []);
    } catch {} finally { setLoading(false); }
  }, [filterDate, filterStore, canManage, isAdmin]);

  useEffect(() => { load(); }, [filterDate, filterStore]);

  useEffect(() => {
    if (!form.employeeId || !form.storeId || !form.workDate) {
      setWorkContext(null);
      return;
    }
    const params = new URLSearchParams({
      employeeId: form.employeeId,
      storeId: form.storeId,
      workDate: form.workDate,
    });
    api.get(`/attendance/work-context?${params}`)
      .then((res) => setWorkContext(res.data.data))
      .catch(() => setWorkContext(null));
  }, [form.employeeId, form.storeId, form.workDate]);

  const handleCreate = async () => {
    try {
      await api.post("/attendance", {
        ...form,
        employeeId: Number(form.employeeId),
        storeId: Number(form.storeId),
      });
      setShowForm(false);
      load();
    } catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  const handleMarkAbsent = async () => {
    try {
      await api.post("/attendance/mark-absent", {
        ...absentForm,
        employeeId: Number(absentForm.employeeId),
        storeId: Number(absentForm.storeId),
      });
      setShowAbsentForm(false);
      load();
    } catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa bản ghi chấm công này?")) return;
    try { await api.delete(`/attendance/${id}`); load(); }
    catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  const statusLabel = (r) => r.statusLabel || (r.status === "Worked" ? "Đi làm" : r.status === "Absent" ? "Không đi làm" : r.status || "—");

  return (
    <div className="mt-4">
      <Card className="border border-blue-gray-100">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Typography variant="h6" color="blue-gray">
              {isEmployee ? "Lịch sử chấm công" : "Chấm công"}
            </Typography>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm" />
              {canManage && (
                <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}
                  className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm">
                  <option value="">Tất cả cửa hàng</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              {canManage && (
                <>
                  <Button size="sm" variant="outlined" className="flex items-center gap-1" onClick={() => setShowAbsentForm(!showAbsentForm)}>
                    Không đi làm
                  </Button>
                  <Button size="sm" className="flex items-center gap-1" onClick={() => setShowForm(!showForm)}>
                    <PlusIcon className="w-4 h-4" /> Nhập giờ
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {isEmployee && (
            <div className="px-4 py-3 border-b bg-amber-50/80">
              <Typography variant="small" className="text-amber-900 text-sm leading-relaxed">
                Giờ làm do <strong>quản lý chấm hộ</strong> sau khi bạn đi làm thực tế. Bạn không tự bấm vào/ra để tránh chấm nhầm khi chưa đến cửa hàng.
              </Typography>
            </div>
          )}

          {showForm && canManage && (
            <div className="p-4 border-b bg-blue-50/40">
              <Typography variant="small" className="font-semibold mb-3">Nhập giờ vào / ra (quản lý)</Typography>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-blue-gray-500 mb-1 block">Nhân viên *</label>
                  <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full rounded-lg border border-blue-gray-200 px-3 py-2.5 text-sm">
                    <option value="">Chọn nhân viên</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-blue-gray-500 mb-1 block">Cửa hàng *</label>
                  <select value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                    className="w-full rounded-lg border border-blue-gray-200 px-3 py-2.5 text-sm">
                    <option value="">Chọn cửa hàng</option>
                    {stores.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <Input type="date" label="Ngày làm *" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} />
                <Input type="time" label="Giờ vào *" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
                <Input type="time" label="Giờ ra *" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
                <Input label="Ghi chú" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              {workContext && (
                <Typography variant="small" color="gray" className="text-xs px-1 pb-2">
                  Giờ chuẩn từ DB: <strong>{workContext.standardHours}h</strong>
                  {workContext.shiftName ? ` (ca: ${workContext.shiftName})` : " (cấu hình cửa hàng)"}
                  {" · "}OT ×{workContext.overtimeRateMultiplier}
                </Typography>
              )}
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleCreate}>Lưu</Button>
                <Button size="sm" variant="outlined" onClick={() => setShowForm(false)}>Hủy</Button>
              </div>
            </div>
          )}

          {showAbsentForm && canManage && (
            <div className="p-4 border-b bg-red-50/40">
              <Typography variant="small" className="font-semibold mb-3">Ghi nhận không đi làm</Typography>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-blue-gray-500 mb-1 block">Nhân viên *</label>
                  <select value={absentForm.employeeId} onChange={(e) => setAbsentForm({ ...absentForm, employeeId: e.target.value })}
                    className="w-full rounded-lg border border-blue-gray-200 px-3 py-2.5 text-sm">
                    <option value="">Chọn nhân viên</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-blue-gray-500 mb-1 block">Cửa hàng *</label>
                  <select value={absentForm.storeId} onChange={(e) => setAbsentForm({ ...absentForm, storeId: e.target.value })}
                    className="w-full rounded-lg border border-blue-gray-200 px-3 py-2.5 text-sm">
                    <option value="">Chọn cửa hàng</option>
                    {stores.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <Input type="date" label="Ngày *" value={absentForm.workDate} onChange={(e) => setAbsentForm({ ...absentForm, workDate: e.target.value })} />
                <Input label="Ghi chú" value={absentForm.note} onChange={(e) => setAbsentForm({ ...absentForm, note: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" color="red" onClick={handleMarkAbsent}>Lưu</Button>
                <Button size="sm" variant="outlined" onClick={() => setShowAbsentForm(false)}>Hủy</Button>
              </div>
            </div>
          )}

          <MobileListShell loading={loading} empty={!loading && records.length === 0} emptyText="Không có bản ghi nào" count={records.length}>
            {records.map((r) => (
              <MobileCard key={r.id}>
                <Typography variant="small" className="font-semibold">{r.employeeName}</Typography>
                <Typography variant="small" color="gray" className="text-xs font-mono">{r.employeeCode}</Typography>
                <MobileRow label="Cửa hàng">{r.storeName}</MobileRow>
                <MobileRow label="Ngày">{new Date(r.workDate).toLocaleDateString("vi-VN")}</MobileRow>
                <MobileRow label="Giờ vào">{r.checkIn}</MobileRow>
                <MobileRow label="Giờ ra">{r.isOpen ? "Đang làm..." : (r.checkOut || "—")}</MobileRow>
                {!r.isOpen && r.status === "Worked" && (
                  <>
                    <MobileRow label="Số giờ">{Number(r.workedHours).toFixed(1)}h</MobileRow>
                    <MobileRow label="OT">{r.overtimeHours > 0 ? `+${Number(r.overtimeHours).toFixed(1)}h` : "—"}</MobileRow>
                  </>
                )}
                <MobileRow label="Trạng thái">
                  <Chip size="sm" color={statusColors[r.status] || "gray"} value={statusLabel(r)} className="w-fit ml-auto normal-case" />
                </MobileRow>
                {canManage && (
                  <button type="button" onClick={() => handleDelete(r.id)} className="text-xs text-red-500 font-medium pt-1 border-t border-blue-gray-100 w-full text-left">
                    Xóa
                  </button>
                )}
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2.5 text-left">Nhân viên</th>
                <th className="px-4 py-2.5 text-left">Cửa hàng</th>
                <th className="px-4 py-2.5 text-center">Ngày</th>
                <th className="px-4 py-2.5 text-center">Vào</th>
                <th className="px-4 py-2.5 text-center">Ra</th>
                <th className="px-4 py-2.5 text-center">Số giờ</th>
                <th className="px-4 py-2.5 text-center">OT</th>
                <th className="px-4 py-2.5 text-center">TT</th>
                {canManage && <th className="px-4 py-2.5 text-center">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="py-10 text-center text-gray-400">Không có bản ghi nào</td></tr>
              ) : records.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="px-4 py-2.5 font-medium">{r.employeeName} <span className="text-xs text-gray-400">({r.employeeCode})</span></td>
                  <td className="px-4 py-2.5 text-gray-600">{r.storeName}</td>
                  <td className="px-4 py-2.5 text-center">{new Date(r.workDate).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{r.checkIn}</td>
                  <td className="px-4 py-2.5 text-center font-mono">{r.isOpen ? "—" : r.checkOut}</td>
                  <td className="px-4 py-2.5 text-center">{r.isOpen ? "—" : `${Number(r.workedHours).toFixed(1)}h`}</td>
                  <td className="px-4 py-2.5 text-center">{r.isOpen ? "—" : (r.overtimeHours > 0 ? `+${r.overtimeHours}h` : "—")}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Chip size="sm" color={statusColors[r.status] || "gray"} value={statusLabel(r)} className="w-fit mx-auto normal-case" />
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Xóa</button>
                    </td>
                  )}
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
