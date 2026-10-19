import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Typography, Button, Spinner, Chip } from "@material-tailwind/react";
import {
  VideoCameraIcon,
  UserPlusIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  CameraIcon,
} from "@heroicons/react/24/solid";
import api from "@/api";
import { FACE_AI_URL, streamUrl, getAutoCheckinStatus } from "@/api/faceAi";
import StoreFaceEnrollModal from "@/components/StoreFaceEnrollModal";

function StatusDot({ on, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`w-2.5 h-2.5 rounded-full ${on ? "bg-green-500" : "bg-blue-gray-300"}`} />
      {label}
    </span>
  );
}

export default function Cameras() {
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [liveStoreId, setLiveStoreId] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [msg, setMsg] = useState(null);

  // Đăng ký khuôn mặt (bằng camera cửa hàng, nhiều góc)
  const [regEmp, setRegEmp] = useState("");
  const [regStore, setRegStore] = useState("");
  const [faceModalOpen, setFaceModalOpen] = useState(false);

  const loadStores = useCallback(async () => {
    const res = await api.get("/stores");
    const list = (res.data?.data ?? []).map((s) => ({
      ...s,
      _rtsp: s.checkinCameraRtsp ?? "",
      _roi: s.checkinRoi ?? "",
      _enabled: !!s.checkinCameraEnabled,
    }));
    setStores(list);
    return list;
  }, []);

  const loadEmployees = useCallback(async () => {
    const res = await api.get("/employees", { params: { isActive: true } });
    setEmployees(res.data?.data ?? []);
  }, []);

  const loadAiStatus = useCallback(async () => {
    try {
      setAiStatus(await getAutoCheckinStatus());
    } catch {
      setAiStatus({ error: true });
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadStores(), loadEmployees(), loadAiStatus()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStores, loadEmployees, loadAiStatus]);

  useEffect(() => {
    const id = setInterval(loadAiStatus, 8000);
    return () => clearInterval(id);
  }, [loadAiStatus]);

  const patchStore = (id, patch) =>
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const saveCamera = async (s) => {
    setSavingId(s.id);
    setMsg(null);
    try {
      await api.put(`/stores/${s.id}`, {
        name: s.name,
        address: s.address,
        phone: s.phone,
        standardWorkHoursPerDay: s.standardWorkHoursPerDay,
        overtimeRateMultiplier: s.overtimeRateMultiplier,
        managerEmployeeId: s.managerEmployeeId,
        checkinCameraRtsp: s._rtsp,
        checkinCameraEnabled: s._enabled,
        checkinRoi: s._roi,
      });
      setMsg({ ok: true, text: `Đã lưu camera cho "${s.name}".` });
      await loadStores();
      loadAiStatus();
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message ?? "Lưu thất bại." });
    } finally {
      setSavingId(null);
    }
  };

  const openFaceModal = () => {
    if (!regEmp) {
      setMsg({ ok: false, text: "Chọn nhân viên trước." });
      return;
    }
    setMsg(null);
    setFaceModalOpen(true);
  };

  const regEmpObj = employees.find((e) => e.employeeCode === regEmp) || null;

  const connectedMap = {};
  (aiStatus?.cameras ?? []).forEach((c) => (connectedMap[c.storeId] = c.connected));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mt-6 mb-8 flex flex-col gap-6">
      {/* Trạng thái service AI */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <VideoCameraIcon className="h-6 w-6 text-blue-500" />
            <div>
              <Typography variant="h6" color="blue-gray">Hệ thống nhận diện khuôn mặt</Typography>
              <Typography variant="small" className="text-blue-gray-500">
                Service AI: <span className="font-mono">{FACE_AI_URL}</span>
              </Typography>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {aiStatus?.error ? (
              <Chip color="red" value="Service AI ngoại tuyến" icon={<XCircleIcon className="h-4 w-4" />} />
            ) : (
              <Chip
                color={aiStatus?.enabled ? "green" : "blue-gray"}
                value={aiStatus?.enabled ? "Tự điểm danh: BẬT" : "Tự điểm danh: TẮT"}
                icon={<CheckCircleIcon className="h-4 w-4" />}
              />
            )}
            <Button size="sm" variant="outlined" className="flex items-center gap-2" onClick={loadAiStatus}>
              <ArrowPathIcon className="h-4 w-4" /> Làm mới
            </Button>
          </div>
        </CardBody>
      </Card>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {msg.text}
        </div>
      )}

      {/* Cấu hình camera theo cửa hàng */}
      <Card>
        <CardBody>
          <Typography variant="h6" color="blue-gray" className="mb-1">
            Camera check-in theo cửa hàng
          </Typography>
          <Typography variant="small" className="text-blue-gray-500 mb-4">
            Camera luôn bật. Nhân viên tới → tự chấm vào. Lần cuối camera thấy mặt = giờ tan ca (tự chốt sau ~30 phút không thấy lại). Nhân viên không cần bấm nút nào.
            <span className="block mt-1 text-blue-gray-400">Để trống ô nguồn camera = dùng <span className="font-mono">webcam mặc định của máy</span> chạy AI.</span>
          </Typography>
          <div className="flex flex-col gap-5">
            {stores.map((s) => (
              <div key={s.id} className="rounded-xl border border-blue-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Typography variant="h6" color="blue-gray">{s.name}</Typography>
                    <StatusDot on={connectedMap[s.id]} label={connectedMap[s.id] ? "Camera đang kết nối" : "Chưa kết nối"} />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={s._enabled}
                      disabled={savingId === s.id}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        patchStore(s.id, { _enabled: checked });
                        // Tick là LƯU NGAY (không cần bấm nút Lưu) để không bị mất khi tải lại trang.
                        saveCamera({ ...s, _enabled: checked });
                      }}
                    />
                    Bật camera tự điểm danh
                    {savingId === s.id && <Spinner className="h-3.5 w-3.5" />}
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  <div className="md:col-span-7">
                    <label className="text-xs text-blue-gray-500">Nguồn camera (để trống = webcam mặc định máy)</label>
                    <input
                      className="w-full mt-1 rounded-lg border border-blue-gray-200 px-3 py-2 text-sm font-mono"
                      placeholder="Để trống = webcam://0 (cam mặc định) — hoặc rtsp://user:pass@ip:554/..."
                      value={s._rtsp}
                      onChange={(e) => patchStore(s.id, { _rtsp: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs text-blue-gray-500">Vùng quét ROI (x1,y1,x2,y2 — tùy chọn)</label>
                    <input
                      className="w-full mt-1 rounded-lg border border-blue-gray-200 px-3 py-2 text-sm font-mono"
                      placeholder="vd: 900,150,1800,1080"
                      value={s._roi}
                      onChange={(e) => patchStore(s.id, { _roi: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2 md:pt-5">
                    <Button
                      size="sm"
                      color="blue"
                      className="flex items-center gap-1"
                      disabled={savingId === s.id}
                      onClick={() => saveCamera(s)}
                    >
                      {savingId === s.id ? <Spinner className="h-4 w-4" /> : "Lưu"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outlined"
                      className="flex items-center gap-1"
                      onClick={() => setLiveStoreId(liveStoreId === s.id ? null : s.id)}
                    >
                      <VideoCameraIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {liveStoreId === s.id && (
                  <div className="mt-3 bg-black rounded-lg overflow-hidden flex justify-center">
                    <img
                      src={streamUrl(s.id)}
                      alt="live"
                      className="max-h-80"
                      onError={(e) => { e.currentTarget.style.opacity = 0.3; }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Đăng ký khuôn mặt nhân viên (bằng camera cửa hàng, nhiều góc) */}
      <Card>
        <CardBody>
          <Typography variant="h6" color="blue-gray" className="mb-1 flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5" /> Đăng ký khuôn mặt cho AI
          </Typography>
          <Typography variant="small" className="text-blue-gray-500 mb-4">
            Nhân viên đứng trước camera cửa hàng. Chọn nhân viên rồi bấm nút để chụp nhiều góc và lưu.
          </Typography>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-blue-gray-500">Nhân viên</label>
              <select
                className="w-full mt-1 rounded-lg border border-blue-gray-200 px-3 py-2 text-sm"
                value={regEmp}
                onChange={(e) => setRegEmp(e.target.value)}
              >
                <option value="">— Chọn nhân viên —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.employeeCode}>
                    {e.employeeCode} — {e.fullName} {e.faceRegistered ? "✓ đã đăng ký" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-blue-gray-500">Camera cửa hàng</label>
              <select
                className="w-full mt-1 rounded-lg border border-blue-gray-200 px-3 py-2 text-sm"
                value={regStore}
                onChange={(e) => setRegStore(e.target.value)}
              >
                <option value="">— Mặc định / chọn cửa hàng —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <Button color="blue" className="flex items-center gap-2" onClick={openFaceModal}>
              <CameraIcon className="h-4 w-4" /> Đăng ký bằng camera
            </Button>
          </div>
        </CardBody>
      </Card>

      <StoreFaceEnrollModal
        open={faceModalOpen}
        employee={regEmpObj}
        stores={stores}
        defaultStoreId={regStore}
        onClose={() => setFaceModalOpen(false)}
        onSaved={() => {
          setMsg({ ok: true, text: "Đã đăng ký khuôn mặt." });
          loadEmployees();
        }}
      />
    </div>
  );
}
