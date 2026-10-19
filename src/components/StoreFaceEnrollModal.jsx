import { useEffect, useMemo, useState } from "react";
import { Button, Typography, Spinner } from "@material-tailwind/react";
import {
  XMarkIcon,
  CameraIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import {
  streamUrl,
  captureStoreShot,
  finishStoreEnroll,
  probeStoreFace,
  getStoreFaceImages,
} from "@/api/faceAi";

const toSrc = (s) =>
  !s ? "" : s.startsWith("data:") ? s : `data:image/jpeg;base64,${s}`;

const HINTS = {
  no_frame: { text: "Đang kết nối camera…", color: "gray" },
  no_face: { text: "Chưa thấy khuôn mặt — đưa mặt vào giữa vòng tròn", color: "amber" },
  too_far: { text: "Lại gần camera hơn", color: "amber" },
  off_center: { text: "Đưa khuôn mặt vào giữa vòng tròn", color: "amber" },
  face_front: { text: "Nhìn thẳng vào camera", color: "amber" },
  turn_left: { text: "Quay mặt sang trái thêm chút nữa", color: "amber" },
  turn_right: { text: "Quay mặt sang phải thêm chút nữa", color: "amber" },
  ok: { text: "Đúng tư thế ✓ — bấm Chụp góc", color: "green" },
};

const STEPS = [
  { label: "Nhìn thẳng vào camera", want: "front" },
  { label: "Quay mặt sang trái một chút", want: "left" },
  { label: "Quay mặt sang phải một chút", want: "right" },
  { label: "Ngẩng nhẹ lên", want: "up" },
  { label: "Cúi nhẹ xuống", want: "down" },
];

/**
 * Đăng ký khuôn mặt bằng CHÍNH camera cửa hàng (camera dùng để chấm công).
 * Nhân viên đứng trước camera quán, người phụ trách bấm "Chụp góc" cho từng góc.
 */
export default function StoreFaceEnrollModal({
  open,
  employee,
  stores = [],
  defaultStoreId,
  onClose,
  onSaved,
}) {
  const [storeId, setStoreId] = useState("");
  const [shots, setShots] = useState([]); // {image, count}
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}
  const [result, setResult] = useState(null);
  const [probe, setProbe] = useState(null); // {hint, face}
  const [existing, setExisting] = useState([]); // ảnh đã đăng ký trước đó

  useEffect(() => {
    if (!open) return;
    setShots([]);
    setMsg(null);
    setResult(null);
    setExisting([]);
    setStoreId(
      defaultStoreId != null && defaultStoreId !== ""
        ? String(defaultStoreId)
        : stores[0]
        ? String(stores[0].id)
        : ""
    );
  }, [open, defaultStoreId, stores]);

  useEffect(() => {
    if (!open || !employee?.employeeCode) return;
    let alive = true;
    getStoreFaceImages(employee.employeeCode)
      .then((r) => alive && setExisting(r.images || []))
      .catch(() => alive && setExisting([]));
    return () => {
      alive = false;
    };
  }, [open, employee]);

  useEffect(() => {
    if (
      !open ||
      !storeId ||
      result?.status === "success" ||
      shots.length >= STEPS.length
    ) {
      setProbe(null);
      return undefined;
    }
    const want = STEPS[Math.min(shots.length, STEPS.length - 1)].want;
    let alive = true;
    let timer = null;
    const tick = async () => {
      try {
        const p = await probeStoreFace(storeId, want);
        if (alive) setProbe(p);
      } catch {
        if (alive) setProbe(null);
      }
      if (alive) timer = setTimeout(tick, 800);
    };
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [open, storeId, result, shots.length]);

  const liveSrc = useMemo(() => (storeId ? streamUrl(storeId) : ""), [storeId]);

  if (!open) return null;

  const success = result?.status === "success";
  const hintInfo = probe ? HINTS[probe.hint] || null : null;
  const faceOk = probe?.hint === "ok";
  const MAX_SHOTS = STEPS.length;
  const enough = shots.length >= 3;
  const full = shots.length >= MAX_SHOTS;
  const step = STEPS[Math.min(shots.length, STEPS.length - 1)];
  const guide = step.label;

  async function shoot() {
    if (!storeId) {
      setMsg({ ok: false, text: "Chọn cửa hàng (camera) trước." });
      return;
    }
    if (shots.length >= MAX_SHOTS) {
      setMsg({ ok: true, text: "Đã đủ góc. Bấm Lưu để hoàn tất." });
      return;
    }
    setCapturing(true);
    setMsg(null);
    try {
      const r = await captureStoreShot(
        employee.employeeCode,
        storeId,
        shots.length === 0 // reset ở góc đầu
      );
      if (r.status === "success") {
        setShots((p) => [...p, { image: r.image, count: r.count }]);
      } else {
        setMsg({ ok: false, text: r.message || "Không bắt được khuôn mặt." });
      }
    } catch (e) {
      setMsg({
        ok: false,
        text:
          e?.response?.data?.detail ||
          "Không gọi được camera AI. Service đang chạy chứ?",
      });
    } finally {
      setCapturing(false);
    }
  }

  function retake() {
    setShots([]);
    setMsg(null);
    setResult(null);
  }

  async function save() {
    if (shots.length === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await finishStoreEnroll(employee.employeeCode);
      setResult(r);
      if (r.status === "success") onSaved && onSaved(r);
    } catch (e) {
      setMsg({
        ok: false,
        text: e?.response?.data?.detail || "Lưu đăng ký thất bại.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <Typography variant="h6" color="blue-gray">
              Đăng ký khuôn mặt bằng camera cửa hàng
            </Typography>
            <Typography variant="small" className="text-blue-gray-500">
              {employee?.fullName || employee?.employeeCode} ·{" "}
              {employee?.employeeCode}
            </Typography>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-blue-gray-500 hover:bg-blue-gray-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          {/* Live + khung */}
          <div>
            <label className="text-xs text-blue-gray-500">Camera cửa hàng</label>
            <select
              className="mb-3 mt-1 w-full rounded-lg border border-blue-gray-200 px-3 py-2 text-sm disabled:bg-blue-gray-50"
              value={storeId}
              disabled={success}
              onChange={(e) => {
                setStoreId(e.target.value);
                setShots([]);
              }}
            >
              <option value="">— Chọn cửa hàng —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="relative mx-auto aspect-square w-full max-w-[440px] overflow-hidden rounded-2xl bg-black">
              {storeId ? (
                <img
                  key={storeId}
                  src={liveSrc}
                  alt="live"
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.opacity = 0.3)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/70">
                  Chọn cửa hàng để xem camera
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "rgba(0,0,0,0.40)",
                  WebkitMaskImage:
                    "radial-gradient(circle at 50% 47%, transparent 0 41%, black 42%)",
                  maskImage:
                    "radial-gradient(circle at 50% 47%, transparent 0 41%, black 42%)",
                }}
              />
              <div
                className={`pointer-events-none absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 transition-colors ${
                  success || faceOk
                    ? "border-green-400"
                    : probe?.face
                    ? "border-amber-400"
                    : "border-white/80"
                }`}
                style={{ width: "82%", height: "82%" }}
              />
            </div>

            {!success &&
              (full ? (
                <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-center">
                  <Typography variant="small" className="font-semibold text-green-700">
                    Đã đủ {MAX_SHOTS} góc ✓ — bấm Lưu để hoàn tất
                  </Typography>
                </div>
              ) : (
                <>
                  {hintInfo && (
                    <div
                      className={`mt-3 rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                        hintInfo.color === "green"
                          ? "bg-green-50 text-green-700"
                          : hintInfo.color === "amber"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-gray-50 text-blue-gray-600"
                      }`}
                    >
                      {hintInfo.text}
                    </div>
                  )}
                  <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-center">
                    <Typography variant="small" className="font-semibold text-blue-800">
                      Góc {shots.length + 1}/{MAX_SHOTS}: {guide}
                    </Typography>
                  </div>
                </>
              ))}
          </div>

          {/* Thumbnails + trạng thái */}
          <div className="flex flex-col">
            <Typography variant="small" className="mb-2 text-blue-gray-600">
              Nhân viên đứng trước camera quán, vào giữa vòng tròn. Bấm{" "}
              <b>Chụp góc</b> cho mỗi tư thế (3–5 góc).
            </Typography>

            <Typography variant="small" className="mb-1 font-semibold text-blue-gray-700">
              {shots.length > 0
                ? `Ảnh vừa chụp (${shots.length}/${MAX_SHOTS})`
                : existing.length > 0
                ? `Ảnh đã đăng ký (${existing.length})`
                : "Ảnh khuôn mặt"}
            </Typography>

            <div className="grid grid-cols-3 gap-2">
              {shots.length > 0 ? (
                shots.map((s, i) => (
                  <img
                    key={i}
                    src={toSrc(s.image)}
                    alt={`shot-${i}`}
                    className="aspect-square w-full rounded-md object-cover ring-2 ring-blue-200"
                  />
                ))
              ) : existing.length > 0 ? (
                existing.map((img, i) => (
                  <img
                    key={i}
                    src={toSrc(img)}
                    alt={`face-${i}`}
                    className="aspect-square w-full rounded-md object-cover ring-2 ring-green-200"
                  />
                ))
              ) : (
                <div className="col-span-3 rounded-md border border-dashed border-blue-gray-200 py-8 text-center text-sm text-blue-gray-400">
                  Chưa có ảnh nào
                </div>
              )}
            </div>

            {shots.length === 0 && existing.length > 0 && !success && (
              <Typography variant="small" className="mt-2 text-blue-gray-500">
                Nhân viên này đã có ảnh. Bấm <b>Chụp góc</b> để đăng ký lại từ đầu
                (ảnh cũ sẽ được thay).
              </Typography>
            )}

            {!success && shots.length > 0 && !enough && (
              <Typography variant="small" className="mt-2 text-amber-700">
                Cần tối thiểu 3 góc để lưu (đang có {shots.length}).
              </Typography>
            )}

            {msg && (
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}
              >
                {msg.text}
              </div>
            )}
            {success && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircleIcon className="h-5 w-5" />
                {result.message}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3">
          {success ? (
            <Button color="green" onClick={onClose}>
              Hoàn tất
            </Button>
          ) : (
            <>
              {shots.length > 0 && (
                <Button
                  variant="text"
                  color="blue-gray"
                  onClick={retake}
                  className="flex items-center gap-1"
                >
                  <ArrowPathIcon className="h-4 w-4" /> Chụp lại
                </Button>
              )}
              <Button
                color="blue"
                disabled={!storeId || capturing || full}
                onClick={shoot}
                className="flex items-center gap-2"
              >
                {capturing ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <CameraIcon className="h-4 w-4" />
                )}
                {full ? `Đã đủ (${shots.length}/${MAX_SHOTS})` : `Chụp góc (${shots.length}/${MAX_SHOTS})`}
              </Button>
              <Button color="green" disabled={!enough || saving} onClick={save}>
                {saving ? "Đang lưu…" : `Lưu (${shots.length})`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
