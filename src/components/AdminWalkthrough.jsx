import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const tours = {
  stores: [
    ["stores-open", "Bấm Thêm cửa hàng để mở biểu mẫu."],
    ["store-name", "Nhập tên cửa hàng."],
    ["store-hours", "Kiểm tra giờ công chuẩn mỗi ngày. Điền các thông tin còn lại rồi bấm Lưu."],
  ],
  employees: [
    ["employees-open", "Bấm Thêm nhân viên để mở biểu mẫu."],
    ["employee-name", "Nhập họ và tên nhân viên."],
    ["employee-user", "Chọn tên đăng nhập chưa được sử dụng."],
    ["employee-email", "Nhập email của nhân viên."],
    ["employee-password", "Đặt mật khẩu ban đầu."],
    ["employee-date", "Chọn ngày vào làm."],
    ["employee-grade", "Chọn bậc lương hoặc nhập mức lương thủ công ở ô kế bên."],
    ["employee-role", "Chọn Nhân viên hoặc Quản lý."],
    ["employee-store", "Chọn cửa hàng chính. Điền thông tin ngân hàng nếu cần, rồi bấm Lưu."],
  ],
  payroll: [
    ["payroll-open", "Bấm Tính lương mới để mở biểu mẫu."],
    ["payroll-store", "Chọn cửa hàng cần tính lương."],
    ["payroll-month", "Chọn tháng tính lương."],
    ["payroll-year", "Chọn năm tính lương."],
    ["payroll-submit", "Kiểm tra lại kỳ và cửa hàng. Bấm Tính lương khi đã sẵn sàng tạo bảng."],
  ],
};

function Walkthrough({ steps }) {
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const [available, setAvailable] = useState(false);
  const [targetId, instruction] = steps[index];

  useEffect(() => {
    if (closed) return;
    let target;
    const find = (id) => document.querySelector(`[data-guide="${id}"]`);
    const update = () => {
      if (index === 0 && find(steps[1][0])) {
        setIndex(1);
        return;
      }
      const next = find(targetId);
      if (target === next) return;
      target?.classList.remove("ring-4", "ring-blue-500", "rounded-md");
      target = next;
      setAvailable(Boolean(target));
      if (!target) return;
      target.classList.add("ring-4", "ring-blue-500", "rounded-md");
      target.scrollIntoView({ block: "center" });
      const control = target.matches("button,input,select") ? target : target.querySelector("input,select,button");
      control?.focus({ preventScroll: true });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    const onEscape = (event) => {
      if (event.key === "Escape") setClosed(true);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", onEscape);
      target?.classList.remove("ring-4", "ring-blue-500", "rounded-md");
    };
  }, [closed, index, steps, targetId]);

  if (closed) return null;
  return (
    <aside aria-label="Hướng dẫn từng bước" className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm rounded-lg border border-blue-200 bg-white p-3 text-sm shadow-lg sm:bottom-6 sm:left-auto">
      <p aria-live="polite" className="text-blue-gray-900">
        {available || index === 0 ? instruction : "Biểu mẫu đã đóng. Mở lại để tiếp tục hoặc kết thúc hướng dẫn."}
      </p>
      <div className="mt-2 flex justify-end gap-3">
        <button type="button" className="px-2 py-1" onClick={() => setClosed(true)}>Đóng</button>
        {index > 0 && (
          <button type="button" disabled={!available} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
            onClick={() => index + 1 === steps.length ? setClosed(true) : setIndex(index + 1)}>
            {index + 1 === steps.length ? "Kết thúc" : "Tiếp"}
          </button>
        )}
      </div>
    </aside>
  );
}

export default function AdminWalkthrough() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const tour = location.state?.adminTour;
  const steps = tours[tour];
  if (!isAdmin || !Array.isArray(steps) || location.pathname !== `/dashboard/${tour}`) return null;
  return <Walkthrough key={location.key} steps={steps} />;
}
