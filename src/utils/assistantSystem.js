export function getAssistantSystem() {
  return "chamcong";
}

export function assistantStoragePrefix() {
  return "cc_assistant";
}

export const STARTER_HINTS_BY_SYSTEM = {
  chamcong: [
    "Hôm nay em chấm chưa?",
    "Ca chờ duyệt",
    "Ai trễ hôm nay?",
    "Ai chưa check-in?",
    "CH nào thiếu ca?",
    "Tóm tắt vận hành hôm nay",
    "Ai vắng hôm nay?",
    "Ca bị cờ tuần này",
    "Lương tháng này của em",
    "Ca hôm nay của em",
    "Lịch tuần này của em",
    "Bảng lương cửa hàng",
    "Ca từ chối tuần này",
    "So sánh ca và chấm công",
    "Ai chưa đăng ký mặt?",
    "CH nào bật camera?",
    "Nhận diện hôm nay",
    "Duyệt hết ca chờ",
    "Tính lương tháng này",
    "Mức bảo hiểm hệ thống",
    "Bạn có thể làm gì?",
  ],
};

export const FEEDBACK_CORRECTIONS_BY_SYSTEM = {
  chamcong: [
    { skillId: "attendance_my_today", label: "Chấm công hôm nay (tôi)" },
    { skillId: "attendance_late_arrival", label: "Ai trễ hôm nay" },
    { skillId: "shift_regs_pending_approval", label: "Ca chờ duyệt" },
    { skillId: "attendance_missing_checkin", label: "Chưa check-in" },
    { skillId: "operations_dashboard_kpi", label: "Tóm tắt vận hành" },
    { skillId: "shift_staffing_understaffed", label: "CH thiếu nhân sự" },
    { skillId: "attendance_absent_confirmed", label: "Ai vắng hôm nay" },
    { skillId: "attendance_flagged_records", label: "Ca bị cờ" },
    { skillId: "payroll_detail_employee", label: "Phiếu lương NV" },
    { skillId: "shift_regs_by_employee", label: "Lịch ca 1 NV" },
  ],
};
