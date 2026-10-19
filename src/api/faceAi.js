import axios from "axios";

// URL service AI nhận diện khuôn mặt (FastAPI). Cấu hình qua VITE_FACE_AI_URL.
// Mặc định localhost:8000 (chạy cùng máy chủ chấm công).
export const FACE_AI_URL = import.meta.env.VITE_FACE_AI_URL ?? "http://localhost:8000";

const faceApi = axios.create({ baseURL: FACE_AI_URL });

/** URL ảnh MJPEG live của camera 1 cửa hàng (dùng cho thẻ <img>). */
export function streamUrl(storeId) {
  const t = Date.now();
  return `${FACE_AI_URL}/api/v1/checkin/stream?store=${storeId}&_=${t}`;
}

/** Trạng thái các camera tự điểm danh + log nhận diện gần nhất. */
export async function getAutoCheckinStatus() {
  const res = await faceApi.get("/api/auto-checkin/status");
  return res.data;
}

/** Chụp 1 khuôn mặt từ camera cửa hàng để đăng ký. */
export async function captureFace(storeId) {
  const res = await faceApi.get(`/api/v1/checkin/register/capture`, {
    params: storeId != null ? { store: storeId } : {},
    timeout: 15000,
  });
  return res.data; // { status, message, image, face_count }
}

/** Lưu ảnh khuôn mặt cho 1 nhân viên (employee_id = mã nhân viên). */
export async function saveFace(employeeCode, imageBase64) {
  const res = await faceApi.post(`/api/v1/checkin/register/save`, {
    employee_id: employeeCode,
    image: imageBase64,
  });
  return res.data;
}

/**
 * Đăng ký khuôn mặt NHIỀU GÓC cho 1 nhân viên.
 * images: mảng base64 (data URL hoặc base64 thuần đều được).
 */
export async function enrollFaces(employeeCode, images) {
  const clean = (images || []).map((s) =>
    typeof s === "string" && s.includes(",") ? s.split(",")[1] : s
  );
  const res = await faceApi.post(
    `/api/v1/checkin/register/enroll`,
    { employee_id: employeeCode, images: clean },
    { timeout: 30000 }
  );
  return res.data; // { status, message, saved, skipped }
}

/** Chụp 1 góc trực tiếp từ camera cửa hàng và lưu ngay (server-side crop). */
export async function captureStoreShot(employeeCode, storeId, reset = false) {
  const res = await faceApi.post(
    `/api/v1/checkin/register/store/shot`,
    { employee_id: employeeCode, store: storeId != null ? Number(storeId) : null, reset },
    { timeout: 15000 }
  );
  return res.data; // { status, message, count, image }
}

/** Kiểm tra khuôn mặt + hướng quay (hướng dẫn căn mặt theo thời gian thực). */
export async function probeStoreFace(storeId, want = "front") {
  const params = { want };
  if (storeId != null) params.store = Number(storeId);
  const res = await faceApi.get(`/api/v1/checkin/register/store/probe`, {
    params,
    timeout: 8000,
  });
  return res.data; // { hint, face, want, yaw, pitch, cx, cy, areaRatio }
}

/** Lấy danh sách ảnh khuôn mặt đã đăng ký của 1 nhân viên (để xem lại). */
export async function getStoreFaceImages(employeeCode) {
  const res = await faceApi.get(`/api/v1/checkin/register/store/images`, {
    params: { employee_id: employeeCode },
    timeout: 15000,
  });
  return res.data; // { employee_id, count, images: [dataUrl...] }
}

/** Hoàn tất đăng ký từ camera cửa hàng (nạp lại cache + cập nhật BE). */
export async function finishStoreEnroll(employeeCode) {
  const res = await faceApi.post(`/api/v1/checkin/register/store/finish`, {
    employee_id: employeeCode,
  });
  return res.data; // { status, message, count }
}

export default faceApi;
