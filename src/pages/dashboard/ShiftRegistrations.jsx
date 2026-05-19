import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, Typography, Button, Chip } from "@material-tailwind/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { fetchStoreOptions } from "@/utils/storesApi";
import {
  MobileCard, MobileListShell, MobileRow, MobileField, MobileTextInput, MobileSelect,
  CompactFormPanel,
} from "@/components/mobile/MobileCard";

const statusColors = { Pending: "indigo", Approved: "green", Rejected: "red", Cancelled: "gray" };
const statusLabels = { Pending: "Chờ duyệt", Approved: "Đã duyệt", Rejected: "Từ chối", Cancelled: "Đã hủy" };

function formatShiftTime(r) {
  if (r.shiftTime) return r.shiftTime;
  if (r.startTime && r.endTime) return `${r.startTime} – ${r.endTime}`;
  return "—";
}

export default function ShiftRegistrations() {
  const { isEmployee, isAdmin, isManager } = useAuth();
  const [regs, setRegs] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ storeId: "", workDate: "", startTime: "", endTime: "" });
  const [filterStatus, setFilterStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [regRes, storeList] = await Promise.all([
        api.get(`/shift-registrations${filterStatus ? `?status=${filterStatus}` : ""}`),
        fetchStoreOptions(api),
      ]);
      setRegs(regRes.data.data || []);
      setStores(storeList);
    } catch (e) {
      console.error(e);
      setRegs([]);
      setStores([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openForm = async () => {
    setForm({ storeId: "", workDate: "", startTime: "08:00", endTime: "17:00" });
    setShowForm(true);
    try {
      const list = await fetchStoreOptions(api);
      if (list.length) setStores(list);
    } catch { /* giữ danh sách cũ nếu có */ }
  };

  const hasLocalOverlap = () => {
    if (!form.workDate || !form.startTime || !form.endTime) return false;
    return regs.some((r) => {
      if (r.status === "Rejected" || r.status === "Cancelled") return false;
      if (r.workDate?.slice(0, 10) !== form.workDate) return false;
      return form.startTime < r.endTime && r.startTime < form.endTime;
    });
  };

  const handleCreate = async () => {
    if (!form.storeId || !form.workDate || !form.startTime || !form.endTime) {
      alert("Vui lòng điền đủ cửa hàng, ngày làm và giờ từ–đến.");
      return;
    }
    if (hasLocalOverlap()) {
      alert("Trùng khung giờ với ca đã đăng ký trong ngày này. Chọn giờ khác hoặc ngày khác.");
      return;
    }
    try {
      await api.post("/shift-registrations", {
        storeId: Number(form.storeId),
        workDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setShowForm(false);
      load();
    } catch (e) {
      const msg = e?.response?.data?.message;
      const errs = e?.response?.data?.errors;
      alert(errs?.length ? `${msg}\n${errs.join("\n")}` : msg || "Lỗi");
    }
  };

  const approve = async (id) => {
    try { await api.patch(`/shift-registrations/${id}/approve`); load(); }
    catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  const reject = async (id) => {
    const reason = prompt("Lý do từ chối (tùy chọn):");
    try { await api.patch(`/shift-registrations/${id}/reject`, { rejectReason: reason }); load(); }
    catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  const cancel = async (id) => {
    try { await api.patch(`/shift-registrations/${id}/cancel`); load(); }
    catch (e) { alert(e?.response?.data?.message || "Lỗi"); }
  };

  return (
    <div className="mt-4">
      <Card className="border border-blue-gray-100">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Typography variant="h6" color="blue-gray">Đăng ký ca</Typography>
            <div className="flex items-center gap-2">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm">
                <option value="">Tất cả TT</option>
                {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {isEmployee && (
                <Button size="sm" className="flex items-center gap-1" onClick={() => (showForm ? setShowForm(false) : openForm())}>
                  <PlusIcon className="w-4 h-4" /> Đăng ký ca
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {showForm && isEmployee && (
            <CompactFormPanel
              title="Đăng ký ca làm"
              hint="Có thể đăng ký nhiều cửa hàng trong ngày nếu khung giờ không trùng (vd: sáng CH A, chiều CH B)."
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              saveLabel="Đăng ký"
            >
              <MobileField label="Cửa hàng" required prominent className="sm:col-span-2 lg:col-span-1">
                <MobileSelect value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
                  <option value="">Chọn cửa hàng</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </MobileSelect>
              </MobileField>
              <MobileField label="Ngày làm" required prominent>
                <MobileTextInput type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} />
              </MobileField>
              <MobileField label="Từ giờ" required prominent>
                <MobileTextInput type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </MobileField>
              <MobileField label="Đến giờ" required prominent>
                <MobileTextInput type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </MobileField>
            </CompactFormPanel>
          )}
          <MobileListShell loading={loading} empty={!loading && regs.length === 0} emptyText="Không có đăng ký nào" count={regs.length}>
            {regs.map((r) => (
              <MobileCard key={r.id}>
                <Typography variant="small" className="font-semibold">{r.employeeName}</Typography>
                <MobileRow label="Giờ làm">{formatShiftTime(r)}</MobileRow>
                <MobileRow label="Cửa hàng">{r.storeName}</MobileRow>
                <MobileRow label="Ngày">{new Date(r.workDate).toLocaleDateString("vi-VN")}</MobileRow>
                <MobileRow label="Trạng thái">
                  <Chip size="sm" color={statusColors[r.status] || "gray"} value={statusLabels[r.status] || r.status} className="w-fit ml-auto normal-case" />
                </MobileRow>
                {r.rejectReason && <Typography variant="small" className="text-red-500 text-xs">{r.rejectReason}</Typography>}
                <div className="flex flex-wrap gap-3 pt-1 border-t border-blue-gray-100">
                  {(isAdmin || isManager) && r.status === "Pending" && (
                    <>
                      <button type="button" onClick={() => approve(r.id)} className="text-xs text-green-600 font-medium">Duyệt</button>
                      <button type="button" onClick={() => reject(r.id)} className="text-xs text-red-500 font-medium">Từ chối</button>
                    </>
                  )}
                  {isEmployee && r.status === "Pending" && (
                    <button type="button" onClick={() => cancel(r.id)} className="text-xs text-gray-500 font-medium">Hủy</button>
                  )}
                </div>
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2.5 text-left">Nhân viên</th>
                <th className="px-4 py-2.5 text-left">Giờ làm</th>
                <th className="px-4 py-2.5 text-left">Cửa hàng</th>
                <th className="px-4 py-2.5 text-center">Ngày làm</th>
                <th className="px-4 py-2.5 text-center">Trạng thái</th>
                <th className="px-4 py-2.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Đang tải...</td></tr>
              ) : regs.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">Không có đăng ký nào</td></tr>
              ) : regs.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="px-4 py-2.5 font-medium">{r.employeeName}</td>
                  <td className="px-4 py-2.5 font-medium">{formatShiftTime(r)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.storeName}</td>
                  <td className="px-4 py-2.5 text-center">{new Date(r.workDate).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Chip size="sm" color={statusColors[r.status] || "gray"} value={statusLabels[r.status] || r.status} className="w-fit mx-auto normal-case" />
                    {r.rejectReason && <p className="text-xs text-red-500 mt-0.5">{r.rejectReason}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {(isAdmin || isManager) && r.status === "Pending" && (
                        <>
                          <button onClick={() => approve(r.id)} className="text-xs text-green-600 hover:underline">Duyệt</button>
                          <button onClick={() => reject(r.id)} className="text-xs text-red-500 hover:underline">Từ chối</button>
                        </>
                      )}
                      {isEmployee && r.status === "Pending" && (
                        <button onClick={() => cancel(r.id)} className="text-xs text-gray-500 hover:underline">Hủy</button>
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
