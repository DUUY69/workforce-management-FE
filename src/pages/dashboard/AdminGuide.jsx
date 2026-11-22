import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const steps = [
  ["Cửa hàng", "stores", [
    "Bấm Thêm cửa hàng. Nhập Tên cửa hàng. Điền Địa chỉ, SĐT, Thương hiệu và Khu vực để dễ nhận biết khi có nhiều điểm bán.",
    "Kiểm tra Giờ chuẩn/ngày rồi bấm Lưu. Kiểm tra cửa hàng vừa tạo xuất hiện trong danh sách.",
    "Nếu chưa có tài khoản Quản lý, lưu cửa hàng trước. Sau khi tạo tài khoản, quay lại Cửa hàng, bấm Sửa và chọn Quản lý cửa hàng.",
  ]],
  ["Cấu hình", "config", [
    "Mở danh mục bậc lương. Kiểm tra đơn giá và loại lương theo giờ hoặc theo tháng trước khi gán cho nhân viên.",
    "Trong Ngày lễ, kiểm tra ngày và hệ số áp dụng. Đối chiếu mức bảo hiểm trong hồ sơ từng người trước khi tính lương.",
  ]],
  ["Nhân viên", "employees", [
    "Bấm Thêm nhân viên. Nhập Họ tên, Username, Email, Mật khẩu và Ngày vào làm.",
    "Chọn Vai trò và Cửa hàng chính. Chọn Nhân viên cho người đi làm, Quản lý cho người phụ trách cửa hàng.",
    "Chọn Bậc lương hoặc nhập mức lương thủ công. Điền Tên ngân hàng, Số TK và Tên chủ TK nếu trả lương qua chuyển khoản.",
    "Bấm Lưu. Mở hồ sơ vừa tạo để kiểm tra cửa hàng, lương và thông tin ngân hàng trước khi bàn giao tài khoản.",
    "Khi thay đổi lương, mở hồ sơ và vào Bậc lương. Kiểm tra tháng áp dụng trước khi lưu để tránh dùng mức mới cho sai kỳ.",
  ]],
  ["Đăng ký ca", "shift-registrations", [
    "Chọn cửa hàng và ngày làm, sau đó mở ngày cần xem để kiểm tra danh sách ca.",
    "Đối chiếu giờ làm và người đăng ký. Xử lý các đăng ký chờ duyệt theo lịch cửa hàng.",
    "Kiểm tra người, ngày và giờ vào/ra trước khi xác nhận. Sau khi duyệt, mở lại ngày đó để đối chiếu danh sách phân công.",
  ]],
  ["Chấm công", "attendance", [
    "Lọc theo cửa hàng và ngày. Đối chiếu giờ vào và giờ ra của từng ca.",
    "Xử lý ca thiếu giờ ra hoặc lệch giờ rồi xác nhận các ca chờ duyệt. Kiểm tra lại trước khi tính lương.",
    "Chỉ xác nhận hàng loạt sau khi đã đối chiếu tất cả ca chờ. Thao tác này dùng giờ nhân viên bấm thực tế.",
  ]],
  ["Bảng lương", "payroll", [
    "Trước khi tính, kiểm tra các ca đã chấm ra và đã xác nhận của đúng cửa hàng và kỳ lương.",
    "Bấm Tính lương mới, chọn cửa hàng, tháng và năm, rồi bấm Tính lương. Mỗi lần tính sẽ sinh một bảng mới. Kiểm tra ngày tạo để mở đúng bản.",
    "Mở bảng nháp vừa tạo. Kiểm tra giờ công, thưởng, phụ cấp và khấu trừ từng người. Bấm Lưu cho các dòng đã sửa.",
    "Bấm Duyệt bảng lương sau khi đối chiếu. Kiểm tra trạng thái xác nhận phiếu của nhân viên trước khi xuất file trả lương.",
    "Nếu có nhiều bản cùng kỳ, xác định bản dùng để chi trả trước khi chọn xuất. Tránh đưa hai phiên bản của cùng cửa hàng và kỳ vào file chuyển khoản.",
  ]],
  ["Báo cáo", "reports", [
    "Chọn cửa hàng và khoảng ngày. Đối chiếu số liệu theo cùng phạm vi với chấm công và bảng lương.",
  ]],
  ["Thông báo", "announcements", [
    "Bấm Thêm thông báo. Nhập tiêu đề, nội dung và chọn phạm vi cửa hàng, rồi bấm Đăng thông báo.",
  ]],
  ["Camera AI", "cameras", [
    "Chọn cửa hàng, điền cấu hình camera đã được bàn giao và kiểm tra trạng thái kết nối trước khi dùng chấm công.",
  ]],
  ["Tuyển dụng", "recruitment", [
    "Mở mục tin tuyển dụng để tạo hoặc cập nhật vị trí. Vào danh sách ứng viên để xem hồ sơ và cập nhật tình trạng xử lý.",
  ]],
];

export default function AdminGuide() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <article className="mx-auto max-w-3xl space-y-6 rounded-lg bg-white p-4 text-sm leading-relaxed text-blue-gray-800 sm:p-6">
      <h1 className="text-xl font-semibold">Hướng dẫn quản trị Workforce</h1>
      <nav aria-label="Mục lục hướng dẫn" className="flex flex-wrap gap-x-4 gap-y-2 border-b border-blue-gray-100 pb-4">
        {steps.map(([label, path]) => (
          <a key={path} href={`#guide-${path}`} className="text-blue-700 underline">{label}</a>
        ))}
        <a href="#guide-payment" className="text-blue-700 underline">Xuất file và trả lương</a>
        <a href="#guide-troubleshooting" className="text-blue-700 underline">Xử lý lỗi</a>
      </nav>
      <section>
        <h2 className="mb-2 text-base font-semibold">Thiết lập và vận hành</h2>
        <ol className="list-decimal space-y-3 pl-5">
          {steps.map(([label, path, instructions]) => (
            <li key={path} id={`guide-${path}`} className="scroll-mt-20">
              <Link to={`/dashboard/${path}`} className="font-semibold text-blue-700 underline">{label}</Link>
              {["stores", "employees", "payroll"].includes(path) && (
                <Link to={`/dashboard/${path}`} state={{ adminTour: path }} className="ml-3 text-blue-700 underline">
                  Bắt đầu hướng dẫn
                </Link>
              )}
              <ol className="list-decimal space-y-1 pl-5">
                {instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
              </ol>
            </li>
          ))}
        </ol>
      </section>
      <section id="guide-payment" className="scroll-mt-20">
        <h2 className="mb-2 text-base font-semibold">Xuất file và ghi nhận trả lương</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Mở bảng lương và bấm <strong>Xuất Excel</strong>. Nếu cần gộp nhiều bảng, chọn các bảng ngay ở danh sách rồi bấm <strong>Xuất Excel chi tiết</strong>.</li>
          <li>Dùng <strong>Xuất Excel tổng</strong> khi cần danh sách tổng hợp. Để lấy từng người nhận tiền, dùng file xuất chi tiết và mở sheet <strong>Chuyen khoan</strong>.</li>
          <li>Mở sheet <strong>Chuyen khoan</strong>, kiểm tra cửa hàng, người nhận, số tài khoản và số thực nhận. Đối chiếu tổng tiền với sheet <strong>Bang luong</strong>.</li>
          <li>Thực hiện thanh toán qua ngân hàng. Sau khi xác nhận đã chuyển, mở bảng lương và bấm <strong>Đánh dấu đã trả</strong>.</li>
        </ol>
      </section>
      <section id="guide-troubleshooting" className="scroll-mt-20">
        <h2 className="mb-2 text-base font-semibold">Khi thiếu dữ liệu</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Không thấy nhân viên:</strong> kiểm tra bộ lọc cửa hàng và trạng thái làm việc, rồi kiểm tra phân công cửa hàng trong hồ sơ.</li>
          <li><strong>Không đủ công:</strong> đối chiếu đúng kỳ và các ca đã ra ca, đã xác nhận trước khi tính lương.</li>
          <li><strong>Thiếu thông tin chuyển khoản:</strong> kiểm tra tài khoản ngân hàng trong hồ sơ nhân viên và đối chiếu lại khi xuất.</li>
          <li><strong>Không bấm được Xuất Excel chi tiết:</strong> chọn ít nhất một bảng trong danh sách. Nếu đã đổi bộ lọc, kiểm tra lại các ô đã chọn.</li>
          <li><strong>Không thấy nút Duyệt bảng lương:</strong> kiểm tra trạng thái bảng. Nút duyệt xuất hiện trên bảng nháp trong chế độ quản lý.</li>
        </ul>
      </section>
    </article>
  );
}
