# Plan: bổ sung Cửa hàng và Chức vụ vào Excel từ dữ liệu hiện có

Ngày cập nhật: 10/11/2026. Trạng thái: đã triển khai FE-only; chưa có nhãn bậc; chưa kiểm chứng API thật.

Plan này thay thế toàn bộ phiên bản trước cùng tên và phần yêu cầu migration/snapshot trong prompt trước. Phạm vi đã được sếp sửa: lấy dữ liệu đang dùng trên giao diện/API để xuất Excel, không sửa database hoặc xây dựng lịch sử nhân sự.

## 1. Mục tiêu và phạm vi

Trong video khoảng 20 giây, người nói yêu cầu thêm `Cửa hàng` và `Chức vụ` vào sheet `Chuyen khoan`; hai cột được tô vàng ngay sau `Mã NV`. Chức vụ cần dùng thông tin hệ thống đang có, bao gồm bậc nhân viên nếu thực sự có dữ liệu/nhãn tương ứng.

- Áp dụng xuất một bảng và xuất nhiều bảng.
- Tái sử dụng dữ liệu/API/format đang dùng ở giao diện.
- Giữ nguyên các khoản tiền, số tài khoản, nội dung CK và luồng chọn/xuất hàng loạt.
- Không migration, thêm cột DB, snapshot, backfill hoặc sửa đường lưu lịch sử lương.
- Không mở rộng chức năng phân quyền, đổi công thức lương hay cải tiến UI ngoài yêu cầu.

## 2. Bằng chứng source và điểm cần xác minh khi làm

| Vị trí | Hiện trạng đã đọc |
|---|---|
| `src/utils/exportPayrollExcel.js` | Có xuất đơn/gộp; sheet chuyển khoản gộp đã có cửa hàng nhưng thiếu chức vụ, bản đơn chưa có hai cột riêng |
| `src/pages/dashboard/Payroll.jsx` | Lấy chi tiết bảng qua API rồi gọi exporter gộp; cần chuẩn bị dữ liệu chức vụ trước khi gọi |
| `src/pages/dashboard/PayrollDetail.jsx` | Có dữ liệu payroll/details và edits; cần bổ sung context cho exporter mà giữ nguyên xử lý ô chưa lưu hiện tại |
| `src/pages/dashboard/Employees.jsx` | GET `/employees`, có `roleLabel`, tên cửa hàng và `currentSalary`; GET danh mục `/config/salary-grades` |
| `src/components/EmployeeDetailModal.jsx`, `SalaryModal.jsx` | Dùng hồ sơ, lịch sử lương và danh mục bậc để hiển thị/form |
| BE DTO nhân viên | Có `id`, `role`, cửa hàng và `currentSalary` |
| BE DTO chi tiết lương | Có `employeeId`, dùng được để ghép hồ sơ; chưa thấy chức vụ trong DTO đã đọc |

**Không coi giả định là dữ kiện:** phần source đã kiểm tra thể hiện role và mức lương, nhưng chưa chứng minh API có nhãn bậc đã gán cho từng nhân viên. Dropdown danh mục bậc không tự chứng minh bậc của nhân viên. Khi triển khai phải chỉ ra field/formatter mà giao diện dùng cho đúng nhãn được xuất; không tự suy bậc từ mức tiền.

Repo đang có thay đổi local. Đọc lại git status/diff trước khi sửa và giữ nguyên phần ngoài phạm vi.

## 3. Quy tắc dữ liệu

### Cửa hàng

- Lấy `payroll.storeName` từ bảng lương nguồn để phân biệt các dòng trong file gộp.
- Không thay bằng `primaryStoreName` hoặc chuỗi tất cả cửa hàng nhân viên đang được phân công.
- Một người có nhiều bảng/cửa hàng vẫn giữ từng dòng như chức năng hiện có.

### Chức vụ

- Ưu tiên field/nhãn chức vụ đã có trong dữ liệu của dòng hoặc hồ sơ đang được giao diện sử dụng.
- Nếu giao diện đang format từ role, tái sử dụng đúng mapping đó, không tự đổi `Quản lý` thành `Cửa hàng trưởng` hoặc coi mọi role Manager là trưởng của mọi cửa hàng.
- Chỉ dùng nhãn `Cửa hàng trưởng` nếu nguồn dữ liệu/logic hiện có thực sự xác định người đó phụ trách cửa hàng nguồn. Không xây dựng thêm nghiệp vụ phân công trong việc xuất file.
- Có bậc được xác định bằng field/quan hệ hoặc logic hiện hữu đã kiểm chứng thì dùng nhãn tương ứng của giao diện. Không lấy index danh mục, hệ số hoặc mức tiền để tự tạo `bậc 1/2/3`.
- Nếu chỉ có `Nhân viên` mà chưa có bậc xác định, xuất `Nhân viên`, ghi rõ phần thiếu trong báo cáo; không tuyên bố đã đáp ứng “bậc mấy”.
- Nếu không tìm thấy hồ sơ, giữ dòng và tiền từ payroll, để trống phần chức vụ chưa biết; không loại nhân viên khỏi file hoặc mặc định một chức vụ sai.
- Cột này dùng thông tin hiện có tại lúc xuất như giao diện. Không cam kết phản ánh lịch sử chức vụ/bậc của kỳ cũ.

## 4. Luồng triển khai tối thiểu

### Bước 1 — Xác định đúng nguồn

1. Đọc response/DTO và formatter của giao diện nhân viên/chức vụ/bậc đang dùng; ghi rõ nguồn từng giá trị.
2. Kiểm tra payload chi tiết payroll trước: nếu đã có thông tin thì dùng trực tiếp, không fetch thừa.
3. Nếu thiếu, dùng API đọc hiện có để lấy danh sách hồ sơ một lần cho lượt xuất, ghép theo `detail.employeeId -> employee.id`. Không ghép theo họ tên hoặc thứ tự dòng.
4. Chỉ lấy danh mục bậc/cửa hàng khi thực sự cần cho logic đã xác minh. Không gọi thêm API theo từng dòng nhân viên và không biến exporter thành nơi gọi HTTP.
5. Đọc bộ lọc API nhân viên: Manager mặc định có thể chỉ thấy người đang active. Nếu cần người nghỉ việc có trong bảng lương, dùng khả năng đọc hiện hữu trong quyền được cấp; thiếu hồ sơ vẫn giữ dòng payroll. Không sửa phạm vi quyền để phục vụ export.

### Bước 2 — Chuẩn bị context ở màn hình gọi xuất

- Ở `Payroll.jsx` và `PayrollDetail.jsx`, chuẩn bị dữ liệu bổ sung đã resolve, chẳng hạn map theo employee ID hoặc từng dòng có thêm nhãn chức vụ.
- Truyền qua tham số options/context của exporter; không mutate payload payroll dùng chung hoặc sửa các ô tiền đang edit.
- Giữ cơ chế giới hạn 4 request chi tiết, AbortController và chống bấm lặp của xuất gộp. Request bổ sung cũng phải được huỷ nếu rời trang/huỷ lượt xuất.
- Lỗi tải nguồn bổ sung là lỗi thực sự: báo rõ và cho thử lại, không nuốt lỗi rồi âm thầm xuất như dữ liệu đầy đủ. Trường hợp request thành công nhưng không có hồ sơ xử lý theo mục 3.
- Mỗi lượt xuất tải đủ dữ liệu cần thiết trước khi ghi file, không tái sử dụng cache cũ qua các lượt nếu chưa có cơ chế cache phù hợp sẵn có.

### Bước 3 — Sửa mapping Excel

- Tái sử dụng helper mapping `bankCells` để xuất đơn/gộp không lệch nhau.
- Sheet chuyển khoản đơn:
  `STT | Nhân viên | Mã NV | Cửa hàng | Chức vụ | Tên ngân hàng | Tên tài khoản | Số tài khoản | Số tiền (thực nhận) | Nội dung CK`.
- Sheet chuyển khoản gộp:
  `STT | ID bảng lương | Kỳ | Trạng thái | Nhân viên | Mã NV | Cửa hàng | Chức vụ | Tên ngân hàng | Tên tài khoản | Số tài khoản | Số tiền (thực nhận) | Nội dung CK`.
- Dời cột cửa hàng đang có của bản gộp về đúng vị trí, không thêm cột trùng.
- Cập nhật header/data, cột tài khoản dạng text, footer tiền, merge tiêu đề và độ rộng cột theo cấu trúc mới.
- Giữ nguyên sheet `Bang luong`, xuất Excel tổng và các giá trị tiền/tài khoản của hai sheet.

### Bước 4 — Chỉ sửa BE mapping nếu có bằng chứng cần thiết

- Ưu tiên hoàn thành bằng FE và API hiện có.
- Nếu nguồn dữ liệu đã tồn tại nhưng các API đọc hiện có không cung cấp được cho luồng xuất, chỉ thêm field DTO/projection đọc tương ứng; không sửa schema/entity hoặc đường ghi dữ liệu.
- Không tự mở thêm endpoint, permission, migration hoặc lưu lịch sử. Nếu bậc chưa có nguồn thật để đọc, nêu giới hạn thay vì dựng dữ liệu hoặc quay lại plan DB cũ.

## 5. File dự kiến

| File | Phạm vi |
|---|---|
| FE `src/utils/exportPayrollExcel.js` | Mapping/context, hai cột và định dạng sheet chuyển khoản |
| FE `src/pages/dashboard/Payroll.jsx` | Chuẩn bị context bổ sung cho xuất gộp |
| FE `src/pages/dashboard/PayrollDetail.jsx` | Chuẩn bị context bổ sung cho xuất đơn |
| FE `src/utils/employeeHelpers.js` | Chỉ chỉnh nếu cần chia sẻ formatter đã có, không tạo framework/helper dư thừa |
| FE `tests/payroll-export.test.mjs` | Đổi assert index cột và thêm ca xuất đơn/gộp |
| BE DTO/mapper đọc liên quan | Chỉ khi bước 4 có căn cứ, liệt kê chính xác file và lý do trong báo cáo |

Không sửa form tạo nhân viên/lưu lương, `Data/*`, `AppDbContext`, SQL, schema ensure hoặc kế hoạch xuất hàng loạt cũ.

## 6. Kiểm chứng và tiêu chí nghiệm thu

1. Một bảng và nhiều bảng: có đúng hai cột ở vị trí đã chốt; mỗi dòng đúng cửa hàng nguồn và nhãn chức vụ từ giao diện.
2. Hồ sơ trả về khác thứ tự payroll: ghép đúng theo employee ID.
3. Một người xuất hiện ở hai cửa hàng: không mất/gộp dòng; cửa hàng theo từng bảng. Nếu nhãn phụ thuộc cửa hàng, resolve theo cả employee ID và store ID.
4. Có bậc thật: nhãn khớp nguồn UI/API. Không có bậc/hồ sơ: không bịa, không làm mất dòng hay đổi tiền.
5. Request nguồn bổ sung lỗi: báo lỗi rõ, không xuất file được trình bày như đã đầy đủ; retry tải lại dữ liệu, huỷ khi rời trang.
6. Round-trip XLSX: số tài khoản giữ chuỗi có số 0 đầu, cột tiền kiểu số, tổng tiền hai sheet khớp và không đổi so với dữ liệu trước thay đổi.
7. Kiểm tra xuất đơn với ô tiền đang edit giữ hành vi trước đây; không ghi ngầm các ô đó lên server khi xuất.
8. Kiểm tra lại xuất tổng và luồng chọn/xuất hàng loạt trên desktop/mobile bằng Playwright; không dùng CUA.
9. Phân biệt mock với API thật, không coi build pass là runtime pass hoặc khẳng định nhãn bậc đúng khi chưa có nguồn xác minh.

Lệnh dự kiến tại FE:

```powershell
node --test tests/payroll-export.test.mjs
npm run build
git diff --check
```

Chạy các test hiện có phù hợp. Chỉ chạy `dotnet build WorkforceManagement.Api.csproj` và test BE nếu có sửa mapper/DTO BE. Kiểm tra lại lỗi nền `time24` nếu chạy toàn bộ suite, không dùng kết quả cũ thay hiện trạng.

## 7. Database, phát hành và kết quả bàn giao

- Không SQL/migration/backfill; không tạo snapshot hoặc lưu thêm dữ liệu.
- FE-only: chỉ cần gói build FE khi được yêu cầu phát hành, không cập nhật DLL BE.
- Nếu sửa BE mapping: báo chính xác file và gói publish có `WorkforceManagement.Api.dll` cần cập nhật khi phát hành; không tự deploy.
- Không commit/push/deploy trong yêu cầu này.
- Cập nhật plan bằng kết quả thực tế; báo nguồn nhãn đã dùng, phần nào đã test và phần nào còn thiếu dữ liệu.

## 8. Trạng thái

Cập nhật 10/11/2026 sau triển khai (FE-only, không sửa BE/DB).

**Nguồn dữ liệu đã xác minh**
- Cửa hàng: `payroll.storeName` của bảng nguồn (file đơn và gộp).
- Chức vụ: `GET /employees` (`EmployeeDto.Role`) qua `roleLabel` — chính mapping màn Nhân viên (`Manager→Quản lý`, `Admin→Admin`, còn lại `Nhân viên`), nay chuyển sang `src/utils/employeeHelpers.js` và `Employees.jsx` import lại. Ghép theo `detail.employeeId → employee.id`. Manager mặc định chỉ thấy NV active nên gọi 2 request `isActive=true` và `isActive=false`, gộp theo id (không gọi theo dòng).
- **Bậc nhân viên: KHÔNG có nguồn.** BE `SalaryCoefficient`/`SalaryCoefficientDto`/`EmployeeDto` không lưu hay trả `salaryGradeId`; `SalaryGradeId` chỉ là input lúc lưu để sao chép giá trị lương (`EmployeesController` ~L323, L624). Không suy bậc từ mức lương nên cột Chức vụ chỉ có `Quản lý/Admin/Nhân viên`; chưa đáp ứng “bậc mấy”. Không có “Cửa hàng trưởng” vì chưa có nguồn xác định.
- Không có căn cứ sửa BE nên không đổi DTO/mapper BE.

**Đã làm**
- [x] `exportPayrollExcel.js`: `bankCells` thêm Cửa hàng + Chức vụ; tách `buildPayrollWorkbook` (đơn); tuỳ chọn `positions` (Map) cho đơn/gộp. Đơn: `STT|Nhân viên|Mã NV|Cửa hàng|Chức vụ|Tên ngân hàng|Tên tài khoản|Số tài khoản|Số tiền|Nội dung CK` (merge 0–9, footer TỔNG cột 7/8). Gộp: `STT|ID bảng lương|Kỳ|Trạng thái|Nhân viên|Mã NV|Cửa hàng|Chức vụ|…` (cột cửa hàng dời, không trùng; text-force cột Số tài khoản = 10). Sheet `Bang luong` không đổi.
- [x] `employeeHelpers.js`: `roleLabel`, `fetchEmployeePositionMap`.
- [x] `Payroll.jsx`: tải map chức vụ song song với chi tiết, cùng `AbortController`; lỗi → alert, không xuất file. `PayrollDetail.jsx`: chụp ô đang sửa tại lúc bấm, tải map, nút disable khi đang xuất, huỷ khi rời trang, không lưu lên server.
- [x] Test: `node --test tests/payroll-export.test.mjs tests/attendance-rules.test.mjs` 12/12 pass (round-trip xlsx: cột, kiểu cell, tổng, hồ sơ khác thứ tự, một người hai cửa hàng, thiếu hồ sơ để trống, lỗi tải); `npm run build` pass.
- [x] Playwright với API **mock** (desktop 1280 và mobile 390): xem kết quả chạy cuối bên dưới.

**Còn thiếu**
- [ ] Kiểm chứng API thật (Admin/Manager, người đã nghỉ, role thật từ `/employees`).
- [ ] Nhãn bậc: cần BE lưu/trả bậc theo nhân viên (quyết định nghiệp vụ riêng).
- `tests/time24.test.mjs` vẫn lỗi nền `ERR_UNKNOWN_FILE_EXTENSION .jsx` (không liên quan).

Kết quả Playwright (API mock, không backend thật) chạy cuối 10/11/2026: 77/77 pass cho desktop+mobile (chọn/xuất hàng loạt, header/cột mới đơn và gộp, chức vụ ghép theo employeeId, đúng 2 request /employees mỗi lượt, lỗi /employees ở cả xuất đơn và gộp không tải file và UI thoát bận, hồi quy xuất tổng, tổng hai sheet khớp).

## 9. Điều chỉnh 10/11/2026: Chức vụ theo bậc lương có sẵn (yêu cầu mới của sếp, thay mục "Nguồn dữ liệu" phần Chức vụ ở trên)
- Cột Chức vụ lấy theo danh mục `GET /config/salary-grades` (ví dụ SL1 "Nhân viên cơ bản", SM1 "Store Manager cấp 1"). Nhãn = tên mô tả của bậc (fallback mã bậc).
- BE không lưu bậc theo nhân viên nên chỉ xác định được bằng cách đối chiếu `currentSalary` của hồ sơ (`GET /employees`, ghép theo employeeId) với bậc: **cùng loại (Hourly/Monthly) và giá trị bằng nhau, và chỉ có đúng 1 bậc khớp** (kể cả bậc đã ngừng dùng). Không khớp hoặc trùng nhiều bậc thì để trống, không đoán. Lương nhập thủ công khác mọi bậc sẽ để trống.
- `fetchEmployeePositionMap` nay gọi 3 request/lượt xuất (NV active, NV đã nghỉ, bậc lương); lỗi thì dừng, không xuất. `roleLabel` giữ cho màn Nhân viên, không còn dùng cho cột Chức vụ.
- Lưu ý: `GET /config/salary-grades` của BE nuốt lỗi DB và trả `[]`, nên khi đó cột Chức vụ trống mà không báo lỗi.
Kết quả sau điều chỉnh (mock API): node --test 12/12 pass (gồm ca bậc khớp/không khớp/trùng/khác loại/bậc ngừng dùng), npm run build pass, Playwright desktop+mobile 79/79 pass; chưa kiểm chứng API thật.
