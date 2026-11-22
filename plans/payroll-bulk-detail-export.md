# Kế hoạch xuất Excel chi tiết nhiều bảng lương

Ngày lập: 09/11/2026. Trạng thái: đã triển khai FE, kiểm chứng mock xong; chưa kiểm chứng API thật.

## 1. Mục tiêu và căn cứ

Người quản lý hiện phải mở từng bảng lương, xuất riêng và copy ghép thủ công. Trong video khoảng 26–35 giây, người nói yêu cầu chọn các dòng ngay tại danh sách rồi xuất một lần; khoảng 35–45 giây phản ánh chức năng xuất ở danh sách chỉ có tổng, thiếu chi tiết.

Kết quả cần đạt: chọn một hoặc nhiều bảng lương theo bộ lọc hiện tại, bấm một lần và nhận một file `.xlsx` chứa chi tiết nhân viên và danh sách chuyển khoản của đúng các bảng đã chọn.

### Source đã kiểm tra

| Vị trí | Hành vi hiện tại | Ý nghĩa triển khai |
|---|---|---|
| `src/pages/dashboard/Payroll.jsx` | `handleExportList()` gọi `exportPayrollListExcel(sorted, { periodLabel })`; desktop có table, mobile có card riêng | Bổ sung chọn dòng và handler xuất chi tiết ở đây |
| `src/utils/exportPayrollExcel.js` | Xuất đơn có hai sheet `Bang luong`, `Chuyen khoan`; xuất danh sách chỉ có sheet `Danh sach` | Tái sử dụng mapping xuất đơn để tạo file gộp |
| `src/pages/dashboard/PayrollDetail.jsx` | Nút xuất trộn `details` với `edits` trước khi gọi exporter | File xuất ở chi tiết có thể chứa sửa đổi chưa lưu; chỉ đối chiếu với file hàng loạt khi các sửa đổi đã lưu |
| BE `Services/PayrollService.cs`, `GetAllAsync()` | `QueryPayrolls(includeDetails: false)` rồi lấy aggregates | Không dùng payload danh sách để giả lập chi tiết |
| BE `Controllers/PayrollsController.cs`, `GetById()` | `GET /payrolls/{id}` trả chi tiết; kiểm tra quyền cửa hàng qua `UserStoreScope` | Dùng API hiện có, không cần endpoint mới ở phạm vi này |
| BE `PayrollService.MapDto()` | Có ID bảng, cửa hàng, kỳ, trạng thái, chi tiết nhân viên; ngân hàng lấy từ `Employee` hiện tại | File phản ánh dữ liệu API tại lúc tải, không phải bản chụp tài khoản ngân hàng lịch sử |
| BE `PayrollService.GenerateAsync()` và UI tạo bảng | Mỗi lần tính tạo một bảng mới | Cùng cửa hàng/kỳ có thể có nhiều bảng; cần giữ ID nguồn |
| FE `package.json` | React 18, Vite 4, `xlsx` đã có; script build là `vite build` | Không cài thêm thư viện xuất Excel hoặc framework test |

Các file Payroll liên quan đang có thay đổi local từ công việc khác. Khi triển khai phải đọc lại diff và chỉ sửa các đoạn thuộc tính năng này.

## 2. Phạm vi và quyết định thiết kế

- Chức năng cho `canManage = (isAdmin || isManager) && !employeeView`, dùng cùng điều kiện cho checkbox, nút và handler.
- Chọn theo `payroll.id`; chọn tất cả nghĩa là toàn bộ danh sách đang được bộ lọc trả về, không phải mọi bảng trong hệ thống. Source hiện chưa phân trang server.
- Giữ chức năng `Xuất Excel tổng` hiện tại. Bổ sung `Xuất Excel chi tiết` cho dữ liệu đã chọn.
- Một workbook, hai sheet gộp: `Bang luong` và `Chuyen khoan`. Đây là phương án đề xuất từ mẫu xuất đơn trong source; video chưa xác nhận một định dạng nhập ngân hàng cụ thể.
- Xuất các trạng thái đang xem được, không tự duyệt, đánh dấu trả tiền hoặc chỉ giữ bảng mới nhất. Ghi trạng thái và ID nguồn vào file.
- Giữ từng dòng chi tiết của từng bảng nguồn. Không cộng dồn theo nhân viên, số tài khoản hoặc cửa hàng/kỳ; không tự loại bảng phiên bản cũ.
- Dữ liệu lấy từ API đã lưu, không lấy dữ liệu chỉnh sửa chưa lưu ở tab chi tiết khác.
- Không thay đổi công thức lương, schema, quyền truy cập hoặc quy trình thanh toán. Không bổ sung ZIP, hàng đợi nền, mẫu ngân hàng hay tuỳ chọn cấu hình xuất.

## 3. Danh sách file dự kiến

| File FE | Thay đổi |
|---|---|
| `src/pages/dashboard/Payroll.jsx` | State chọn dòng; checkbox desktop/mobile; nút xuất; lấy chi tiết có giới hạn đồng thời; lỗi và trạng thái đang xuất; điều chỉnh colspan |
| `src/utils/exportPayrollExcel.js` | Tách phần tạo dữ liệu/sheet vừa đủ để xuất đơn và xuất nhiều dùng chung; thêm builder workbook và hàm ghi file hàng loạt |
| `tests/payroll-export.test.mjs` (mới) | Kiểm tra workbook và dữ liệu sau khi ghi/đọc lại bằng `xlsx` |
| `plans/payroll-bulk-detail-export.md` | Cập nhật tiến độ, lệnh và kết quả thực tế khi triển khai |

Không dự kiến sửa BE hoặc `PayrollDetail.jsx`. Chỉ cân nhắc thay đổi nếu phát hiện vấn đề trực tiếp cản trở tính năng và phải ghi rõ căn cứ.

## 4. Luồng giao diện

### 4.1. Chọn bảng

1. Thêm `selectedPayrollIds` lưu tập ID, không dùng vị trí dòng vì danh sách có sắp xếp.
2. Desktop: thêm cột checkbox trước STT và checkbox chọn tất cả ở header. Cập nhật colspan dòng loading, empty và tổng để không lệch cột.
3. Mobile: checkbox trong từng card, có chọn tất cả trong vùng thao tác chung; dừng propagation khi bấm checkbox/label để không mở trang chi tiết.
4. Checkbox chọn tất cả có ba trạng thái: không chọn, chọn một phần (`indeterminate`), chọn hết.
5. Sắp xếp giữ nguyên tập ID đã chọn. Đổi bộ lọc hoặc bắt đầu tải lại danh sách thì xoá lựa chọn; đổi chế độ nhân viên hoặc mất quyền quản lý cũng xoá lựa chọn.
6. Danh sách đang tải/lỗi/rỗng: không cho xuất chi tiết. Không tạo file khi chưa chọn bảng.

### 4.2. Bấm xuất

- Nhãn `Xuất Excel chi tiết (N)` khi đã chọn; khi chưa chọn dùng `Xuất Excel chi tiết` và disable.
- Khi chạy đổi nhãn thành `Đang xuất...`, disable thao tác xuất chi tiết và checkbox. Không thêm modal, badge hoặc tooltip.
- Bộ lọc và thao tác reload/tạo/xoá bảng tại trang này được disable trong lúc xuất để không đổi tập dữ liệu giữa chừng.
- Snapshot danh sách ID và thứ tự các bảng đã chọn ngay khi bấm. Dùng thứ tự `sorted` tại thời điểm đó; không phụ thuộc thứ tự request hoàn tất.
- Nếu rời trang hoặc đổi vai trò trong lúc chạy, huỷ request còn lại và không tải file muộn sau khi trang đã unmount. Dùng `AbortController` cùng vòng đời hiện có, không thêm hệ thống job.
- Lỗi dùng cơ chế thông báo hiện có. Nêu cửa hàng, kỳ và ID bảng lỗi khi có thể; không hiển thị stack trace.

## 5. Lấy dữ liệu qua API hiện có

Trình tự phụ thuộc: xác minh contract API -> tạo workbook -> nối handler và UI.

1. Chuẩn hoá/deduplicate ID được chọn theo ID bảng và xác nhận vẫn thuộc danh sách đang xem, còn `canManage`.
2. Gọi `GET /payrolls/{id}` qua API client hiện có. Giới hạn tối đa 4 request đồng thời; đây là lựa chọn triển khai ban đầu, chưa có benchmark hiệu năng.
3. Kiểm tra response theo envelope đang dùng trong repo: có payroll, ID khớp, thông tin cửa hàng/kỳ hợp lệ, `details` là array. Không biến payload thiếu `details` thành bảng rỗng.
4. ID chi tiết phải không trùng trong cùng bảng. Các giá trị tiền/số bắt buộc dùng khi xuất phải hữu hạn; không tự chuyển dữ liệu lỗi thành 0. Giá trị nullable hợp lệ xử lý theo contract hiện có.
5. Một request lỗi 401/403/404/5xx, lỗi mạng hoặc payload không hợp lệ: dừng, huỷ phần còn lại, không ghi file. Không xuất phần tải được hoặc tự bỏ qua bảng lỗi.
6. Chỉ tạo workbook khi toàn bộ bảng đã lấy và kiểm tra xong. `finally` luôn trả UI về trạng thái có thể thao tác; sau lỗi giữ lựa chọn để thử lại nếu chưa reload.
7. Một lần thử lại phải tải lại toàn bộ tập đã chọn, không ghép response cũ với response mới.

Giới hạn đã biết: nhiều GET độc lập không đảm bảo snapshot giao dịch đồng thời giữa mọi bảng. Với phạm vi hiện tại, file dùng dữ liệu trả về trong lượt xuất. Không tuyên bố tất cả bảng đã được đọc tại cùng một thời điểm. Chỉ đề xuất API batch/snapshot nếu kiểm chứng cho thấy nghiệp vụ thực sự cần hoặc hiệu năng không đạt.

## 6. Hợp đồng file Excel

### 6.1. Sheet `Bang luong`

Một hàng nhân viên ứng với một detail nguồn. Cột:

`STT | ID bảng lương | Cửa hàng | Kỳ | Trạng thái | Nhân viên | Ngày đi làm | Ngày công | Số giờ | Mức lương | Lương gộp | Thưởng | Phụ cấp | Ghi chú | Khấu trừ | Tên ngân hàng | Tên TK | Số tài khoản | Thực nhận | NV xác nhận`.

- Dùng cùng mapping và định dạng của exporter đơn cho các cột sẵn có; tiền là cell số, không phải chuỗi có dấu phân cách.
- Công thức thực nhận bám mapping hiện hành: `grossSalary + bonus + deliveryAllowance - deduction`. Đối chiếu `netSalary` API khi kiểm chứng; nếu khác phải điều tra mapping/công thức trước khi hoàn tất, không bù chênh hoặc thêm khoản trừ lần hai.
- Phụ cấp dùng tổng `deliveryAllowance` đang được UI/export đơn sử dụng. Không cộng lại `allowances[].amount` vào tổng đó.
- Cột số giờ dùng `formatHoursMinutes`, mức lương dùng `formatHourlyRate` như file đơn.
- Tổng cuối sheet tính từ các dòng đã xuất, không lấy tổng ở danh sách đã tải trước đó. Ghi số bảng nguồn và số dòng nhân viên; không gọi số dòng là số nhân viên duy nhất.

### 6.2. Sheet `Chuyen khoan`

Cột:

`STT | ID bảng lương | Cửa hàng | Kỳ | Trạng thái | Nhân viên | Mã NV | Tên ngân hàng | Tên tài khoản | Số tài khoản | Số tiền (thực nhận) | Nội dung CK`.

- Giữ quy tắc tên ngân hàng/chủ tài khoản và nội dung `Luong T{month}/{year} {employeeCode}` của file đơn.
- Số tài khoản ép cell text từ giá trị chuỗi để giữ số 0 đầu và không chuyển sang dạng khoa học. Nếu API đã mất số 0 thì FE không suy đoán bổ sung; điều tra source dữ liệu.
- Giữ dòng chưa có tài khoản ngân hàng và giá trị thực nhận bằng 0/âm như mapping nguồn; không tự bỏ dòng gây lệch đối soát. Đây là danh sách xuất, không phải lệnh chuyển tiền hoặc file được xác nhận nhập ngân hàng.
- Tổng tiền phải bằng tổng `Thực nhận` của sheet `Bang luong` cho cùng tập detail.
- Các trường chữ như ghi chú/tên/nội dung CK phải là cell string, không tạo formula từ nội dung dữ liệu.

### 6.3. Bảng rỗng, phiên bản và tên file

- `details: []` là bảng rỗng hợp lệ. Ghi danh sách bảng nguồn và số dòng ở phần đầu file để bảng rỗng vẫn truy vết được; không tạo nhân viên giả. Nếu tất cả bảng đều rỗng, báo không có chi tiết và không tải file.
- Hai bảng cùng cửa hàng/kỳ vẫn được giữ nếu sếp chọn cả hai; ID bảng phân biệt nguồn. Không tự hiểu chọn tất cả là chỉ chọn bản mới nhất.
- Tên file đề xuất: `BangLuong_ChiTiet_{N}Bang_{YYYYMMDD_HHmmss}.xlsx`, dùng giờ máy người dùng. Không đưa dữ liệu tài khoản ngân hàng vào tên file.
- Tiêu đề file ghi bộ lọc tại lúc xuất, số bảng và thời gian xuất; vùng nguồn ghi ID, cửa hàng, kỳ, trạng thái và số dòng của từng bảng.
- Không cắt dữ liệu để vừa giới hạn sheet. Nếu số hàng vượt giới hạn Excel sau khi tính cả tiêu đề/nguồn/footer, báo lỗi trước khi ghi file.

## 7. Cách tái sử dụng exporter

1. Tách mapping dòng chi tiết, dòng chuyển khoản và tổng tiền thành helper nhỏ ngay trong `exportPayrollExcel.js`; không tạo tầng service hoặc thư viện mới.
2. Giữ `exportPayrollExcel(payroll, details, { getNet })` và `exportPayrollListExcel(...)` tương thích, giữ tên hai sheet và cột của file xuất đơn hiện tại.
3. Thêm builder workbook hàng loạt, ví dụ `buildPayrollBulkWorkbook(payrolls, options)`, trả về workbook chưa ghi file để kiểm thử thực chất.
4. Thêm hàm export hàng loạt gọi builder rồi `XLSX.writeFile`. Không gọi exporter đơn trong vòng lặp vì sẽ tạo nhiều download.
5. Nếu cần import trực tiếp từ Node để test, đổi duy nhất import `formatMoney` trong utility này sang đường dẫn tương đối có `.js`; không thêm loader hay sửa cấu hình alias toàn dự án.

## 8. Kiểm chứng và tiêu chí nghiệm thu

### 8.1. Kiểm thử dữ liệu bằng Node + xlsx

Tạo `tests/payroll-export.test.mjs`, dùng `node:assert/strict` và thư viện `xlsx` sẵn có. Ghi workbook ra buffer rồi đọc lại, kiểm tra nội dung thực tế:

| Ca | Kết quả bắt buộc |
|---|---|
| Một bảng có thưởng/phụ cấp/khấu trừ | Dữ liệu cột tương ứng khớp mapping file đơn và dữ liệu đã lưu |
| Nhiều bảng, nhiều kỳ, thứ tự response khác nhau | Đủ dòng và ID nguồn, kỳ đúng; thứ tự output theo lựa chọn đã snapshot |
| Một người có mặt ở hai bảng | Giữ hai dòng nguồn; tổng không mất hoặc gộp nhầm |
| Hai phiên bản cùng cửa hàng/kỳ | Có hai ID nguồn riêng, không tự khử trùng theo cửa hàng/kỳ |
| Tài khoản `001234567890123456` | Đọc lại vẫn là chuỗi nguyên vẹn |
| Có phụ cấp nhiều khoản | Tổng phụ cấp không bị cộng hai lần; thực nhận khớp giữa hai sheet |
| Tổng và tiền có phần thập phân | Cell tiền vẫn là số; so sánh theo độ chính xác tiền của hệ thống, không chỉ theo chuỗi hiển thị |
| Một bảng rỗng trong tập | Bảng vẫn có trong metadata nguồn, không có dòng nhân viên giả |
| Tất cả rỗng hoặc dữ liệu số lỗi | Không tạo file mang kết quả giả |
| Tên/ghi chú giống công thức Excel | Cell string, không có thuộc tính formula |

Không chỉ test rằng helper trả về đúng những gì vừa truyền vào. Cần kiểm tra số dòng, vị trí cột, kiểu cell, tổng và nội dung workbook sau round-trip.

Lệnh dự kiến tại thư mục FE:

```powershell
node --test tests/payroll-export.test.mjs
node --test tests/*.test.mjs
npm run build
git diff --check
```

Nếu PowerShell/Node không mở rộng glob theo môi trường thực tế, liệt kê file test rồi truyền danh sách vào `node --test`. Repo chưa có script `npm test`; không báo đã chạy script không tồn tại.

### 8.2. Kiểm tra giao diện bằng Playwright

- Desktop/mobile: chọn một, nhiều, chọn hết, bỏ chọn; checkbox không mở trang chi tiết; `indeterminate` đúng.
- Sort giữ đúng ID đã chọn; đổi bộ lọc/reload xoá lựa chọn. Cột tổng và empty/loading không lệch sau khi thêm checkbox.
- Hai layout dùng chung tập lựa chọn, không xuất thừa bảng khi đổi kích thước màn hình.
- Capture download một file duy nhất; mở lại bằng `xlsx` để kiểm tra đúng tập ID, số dòng và hai tổng tiền.
- Giả lập một request chậm/lỗi/response sai để kiểm tra không có download thiếu, không vượt quá 4 request đang chạy và UI thoát trạng thái bận.
- Rời trang giữa chừng không phát sinh download muộn. Bấm liên tiếp không tạo lượt xuất song song.
- Kiểm tra hồi quy xuất tổng và xuất đơn; khi so sánh file đơn phải lưu các chỉnh sửa trước.
- Mock API chỉ chứng minh luồng FE; ghi rõ nếu chưa kết nối backend thật.

### 8.3. Runtime với API thật

- Admin xuất các bảng đã chọn; Manager chỉ xuất bảng thuộc phạm vi quản lý; Employee và chế độ đóng vai Employee không có chức năng hàng loạt.
- Dùng phiên đăng nhập Manager thực tế xác nhận truy cập ID ngoài quyền bị backend trả 403; không chỉ dựa vào checkbox bị ẩn.
- Chọn bảng bị xoá/mất quyền sau khi tải danh sách: toàn bộ lượt xuất thất bại rõ ràng, không tạo file một phần.
- So sánh payload GET thực tế, file xuất đơn đã lưu và file gộp trên cùng bộ dữ liệu không có chỉnh sửa đồng thời.
- Ghi số bảng, số detail, thời gian tải và thời gian tạo file của lượt nhiều bảng đại diện thực tế. Chưa có mục tiêu SLA hoặc benchmark hiện tại.
- Không tạo/sửa/xoá bảng lương hoặc thực hiện chuyển tiền trên production để test. Dùng dữ liệu local/staging phù hợp hoặc thao tác đọc đã được cấp quyền.

## 9. Thứ tự thực hiện và điều kiện hoàn tất

1. Đọc lại diff local, contract API và API client; xác nhận không ghi đè công việc đang có.
2. Triển khai builder/mapping chung trong utility và kiểm thử workbook.
3. Thêm state selection, UI desktop/mobile và orchestration lấy dữ liệu; nối export.
4. Chạy test/build/diff check; sửa lỗi thuộc phạm vi.
5. Chạy Playwright kiểm tra download, lỗi và hồi quy; kiểm tra API thật nếu có môi trường/đăng nhập.
6. Cập nhật kết quả thực tế vào plan và báo phần chưa kiểm tra. Chỉ nghiệm thu đầy đủ sau khi file tải qua UI khớp dữ liệu nguồn; build pass không thay thế runtime pass.

## 10. Database, phát hành và rollback

- Dự kiến chỉ sửa FE: không migration SQL, không thay DLL, không restart backend.
- Chỉ build local theo plan này. Deploy production cần yêu cầu thực hiện riêng; không coi việc đồng ý plan là lệnh deploy.
- Khi phát hành được yêu cầu: cập nhật FE build theo quy trình hosting đang dùng; xác minh lại một lượt chọn/xuất trên bản đã phát hành.
- Rollback bằng phiên bản FE trước phát hành. Tính năng chỉ GET và tạo file phía trình duyệt, không phát sinh dữ liệu DB cần rollback.

## 11. Trạng thái hiện tại

Cập nhật 09/11/2026 sau triển khai (chỉ sửa FE, không sửa BE/`PayrollDetail.jsx`, không thêm thư viện/endpoint/migration).

- [x] Đối chiếu lời nói đã nhận dạng với khung hình và khảo sát source FE/BE.
- [x] Lập kế hoạch, nêu giả định mẫu file và giới hạn snapshot dữ liệu.
- [x] Utility + test workbook: `src/utils/exportPayrollExcel.js` (helper `detailCells`/`bankCells` dùng chung cho xuất đơn; thêm `assertValidPayrollForExport`, `buildPayrollBulkWorkbook`, `payrollBulkFileName`, `exportPayrollBulkExcel`; import formatMoney đổi sang `./formatMoney.js`), `tests/payroll-export.test.mjs` (7 ca).
- [x] UI + lấy dữ liệu hàng loạt: `src/pages/dashboard/Payroll.jsx` (`selectedIds`, checkbox desktop/mobile, chọn tất cả indeterminate, `handleExportDetail` tối đa 4 request, `AbortController`, khoá bộ lọc/tạo/xoá khi xuất).
- [x] Test/build: `node --test tests/payroll-export.test.mjs` 7/7 pass; `npm run build` pass; `git diff --check` sạch.
- [x] Playwright với API **mock** (route intercept, không backend thật), desktop 1280x900 và mobile 390x800: chọn một/nhiều/hết/indeterminate, checkbox không mở chi tiết, sort giữ chọn, đổi bộ lọc xoá chọn, 1 download đúng tên, tối đa 4 request, 500/403/ID sai/thiếu details không tải file và UI thoát trạng thái bận, thử lại tải lại đủ 6, bấm đúp chỉ một lượt, rời trang không tải muộn, hồi quy xuất tổng và xuất đơn (cột bảng #101 khớp file gộp), tổng hai sheet khớp nguồn.
- [ ] Kiểm chứng API và phân quyền thực tế (Admin/Manager/403 ngoài phạm vi, bảng bị xoá, số liệu thời gian tải): chưa chạy vì chưa có backend/phiên đăng nhập thật trong lượt này.
- [ ] Phát hành khi có yêu cầu.

Ghi chú: `tests/time24.test.mjs` hiện có lỗi sẵn `ERR_UNKNOWN_FILE_EXTENSION .jsx` khi chạy bằng Node thuần (không liên quan thay đổi này); `tests/attendance-rules.test.mjs` pass. Số bảng/chi tiết/thời gian tải với dữ liệu thật chưa đo.

