import { useState, useEffect } from "react";
import { Typography, Spinner } from "@material-tailwind/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import api from "@/api";
import { formatDateVi } from "@/utils/dates";

function confColor(c) {
  const n = Number(c) || 0;
  if (n >= 75) return "bg-green-500";
  if (n >= 65) return "bg-lime-500";
  if (n >= 58) return "bg-amber-500";
  return "bg-red-400";
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Xem lịch sử nhận diện khuôn mặt của 1 nhân viên (do AI camera ghi nhận). */
export default function FaceRecognitionHistoryModal({ open, employee, date, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !employee?.id) return;
    let alive = true;
    setLoading(true);
    setErr("");
    api
      .get("/cameras/recognition-history", {
        params: { employeeId: employee.id, date: date || undefined, take: 300 },
      })
      .then((res) => {
        if (alive) setRows(res.data?.data || []);
      })
      .catch((e) => {
        if (alive) setErr(e?.response?.data?.message || "Không tải được lịch sử nhận diện.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, employee, date]);

  if (!open || !employee) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Đóng" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 bg-blue-50">
          <Typography variant="small" className="font-bold text-blue-900">
            Lịch sử nhận diện
          </Typography>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-blue-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-blue-gray-100">
          <Typography variant="small" className="font-semibold text-blue-gray-900">
            {employee.name}
          </Typography>
          <Typography variant="small" className="text-blue-gray-500 text-xs font-mono">
            {employee.code}
            {date ? ` · ${formatDateVi(date)}` : " · tất cả"}
          </Typography>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-blue-gray-400">
              <Spinner className="h-5 w-5 mr-2" /> Đang tải…
            </div>
          ) : err ? (
            <div className="py-8 px-4 text-center text-sm text-red-500">{err}</div>
          ) : rows.length === 0 ? (
            <div className="py-8 px-4 text-center text-sm text-blue-gray-400">
              Chưa có dữ liệu nhận diện{date ? " trong ngày này" : ""}.
            </div>
          ) : (
            <ul className="divide-y divide-blue-gray-50">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${confColor(r.confidence)}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-blue-gray-800">
                      {Number(r.confidence).toFixed(1)}%
                    </span>
                    {r.storeName && (
                      <span className="block text-xs text-blue-gray-400 truncate">{r.storeName}</span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-blue-gray-500 shrink-0">{fmtTime(r.recognizedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!loading && !err && rows.length > 0 && (
          <div className="px-4 py-2 border-t border-blue-gray-100 text-xs text-blue-gray-400 text-center">
            {rows.length} lần nhận diện
          </div>
        )}
      </div>
    </div>
  );
}
