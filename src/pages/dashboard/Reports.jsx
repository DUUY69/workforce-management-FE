import { useState, useEffect, useCallback } from "react";
import { useSortableTable } from "@/hooks/useSortableTable";
import SortIcon from "@/components/SortIcon";
import { Card, CardBody, Typography, Button } from "@material-tailwind/react";
import api from "@/api";
import { useAuth } from "@/context/AuthContext";
import { fetchStores } from "@/utils/storesApi";
import { MobileCard, MobileListShell, MobileRow } from "@/components/mobile/MobileCard";
import { useUrlFilters } from "@/utils/urlFilters";

const REPORT_FILTER_DEFAULTS = {
  storeId: "",
  month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()),
};

export default function Reports() {
  const { isAdmin } = useAuth();
  const [stores, setStores] = useState([]);
  const [laborRows, setLaborRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [insuranceReport, setInsuranceReport] = useState([]);
  const [laborLoading, setLaborLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insLoading, setInsLoading] = useState(false);
  const { values, setFilter } = useUrlFilters(REPORT_FILTER_DEFAULTS);
  const filter = {
    storeId: values.storeId,
    month: Number(values.month) || new Date().getMonth() + 1,
    year: Number(values.year) || new Date().getFullYear(),
  };

  useEffect(() => {
    fetchStores(api, { isAdmin }).then(setStores).catch(() => {});
  }, [isAdmin]);

  const { sorted: laborSorted, sortKey: laborKey, sortDir: laborDir, handleSort: laborSort } =
    useSortableTable(laborRows, "storeName", "asc");
  const { sorted, sortKey, sortDir, handleSort } = useSortableTable(summary);
  const { sorted: insSorted, sortKey: insSortKey, sortDir: insSortDir, handleSort: insHandleSort } =
    useSortableTable(insuranceReport);

  const loadLabor = useCallback(async () => {
    setLaborLoading(true);
    try {
      const params = new URLSearchParams({ month: String(filter.month), year: String(filter.year) });
      if (filter.storeId) params.set("storeId", filter.storeId);
      const res = await api.get(`/reports/employee-labor?${params}`);
      setLaborRows(res.data.data || []);
    } catch {
      setLaborRows([]);
    } finally {
      setLaborLoading(false);
    }
  }, [filter.month, filter.year, filter.storeId]);

  useEffect(() => {
    loadLabor();
  }, [loadLabor]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: filter.month, year: filter.year });
      if (filter.storeId) params.set("storeId", filter.storeId);
      const res = await api.get(`/attendance/summary?${params}`);
      setSummary(res.data.data || []);
    } catch {
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInsuranceReport = async () => {
    setInsLoading(true);
    try {
      const params = new URLSearchParams({ month: filter.month, year: filter.year });
      const res = await api.get(`/reports/insurance-self-paid?${params}`);
      setInsuranceReport(res.data.data || []);
    } catch {
      setInsuranceReport([]);
    } finally {
      setInsLoading(false);
    }
  };

  const laborTotalPay = laborRows.reduce((s, r) => s + Number(r.estimatedPay || 0), 0);
  const laborTotalHours = laborRows.reduce((s, r) => s + Number(r.workedHours || 0), 0);

  const FilterBar = ({ onReload, reloadLabel = "Tải lại" }) => (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filter.storeId}
        onChange={(e) => setFilter("storeId", e.target.value)}
        className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm"
      >
        <option value="">{isAdmin ? "Tất cả cửa hàng" : "Tất cả CH của tôi"}</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        value={filter.month}
        onChange={(e) => setFilter("month", e.target.value)}
        className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            Tháng {i + 1}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={filter.year}
        onChange={(e) => setFilter("year", e.target.value)}
        className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm w-20"
      />
      {onReload && (
        <Button size="sm" onClick={onReload}>
          {reloadLabel}
        </Button>
      )}
    </div>
  );

  return (
    <div className="mt-4 space-y-6">
      <Card className="border border-blue-gray-100">
        <div className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Typography variant="h6" color="blue-gray">
                Giờ &amp; lương theo NV / cửa hàng
              </Typography>
              <Typography variant="small" color="gray">
                Công đã confirm · ước tính lương (chưa gồm PC/thưởng/BH trên bảng lương) · mặc định theo CH, bấm cột Lương để sắp cao↔thấp · đổi tháng để xem lịch sử
              </Typography>
              {!laborLoading && laborRows.length > 0 && (
                <Typography variant="small" className="text-blue-gray-700 mt-1">
                  {laborRows.length} dòng · {laborTotalHours.toFixed(1)}h · ước tính{" "}
                  {laborTotalPay.toLocaleString("en-US")} đ
                </Typography>
              )}
            </div>
            <FilterBar onReload={loadLabor} />
          </div>
        </div>
        <CardBody className="p-0">
          <MobileListShell
            loading={laborLoading}
            empty={!laborLoading && laborRows.length === 0}
            emptyText="Chưa có công Confirmed trong tháng này"
            count={laborRows.length || null}
          >
            {laborSorted.map((r) => (
              <MobileCard key={`${r.storeId}-${r.employeeId}`}>
                <Typography variant="small" className="font-semibold">
                  {r.employeeName}
                </Typography>
                <Typography variant="small" color="gray" className="text-xs">
                  {r.storeName} · {r.employeeCode}
                </Typography>
                <MobileRow label="Giờ">{Number(r.workedHours).toFixed(1)}h</MobileRow>
                <MobileRow label="Loại">{r.salaryType === "Monthly" ? "Theo tháng" : "Theo giờ"}</MobileRow>
                <MobileRow label="Cần trả">
                  <span className="font-bold text-green-800">{Number(r.estimatedPay).toLocaleString("en-US")} đ</span>
                </MobileRow>
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-3 py-2.5 text-center w-10">STT</th>
                  <th
                    className="px-3 py-2.5 text-left cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => laborSort("storeName")}
                  >
                    Cửa hàng <SortIcon active={laborKey === "storeName"} dir={laborDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-left cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => laborSort("employeeName")}
                  >
                    Nhân viên <SortIcon active={laborKey === "employeeName"} dir={laborDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => laborSort("workedDays")}
                  >
                    Công <SortIcon active={laborKey === "workedDays"} dir={laborDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => laborSort("workedHours")}
                  >
                    Giờ <SortIcon active={laborKey === "workedHours"} dir={laborDir} />
                  </th>
                  <th className="px-3 py-2.5 text-center">Loại</th>
                  <th
                    className="px-3 py-2.5 text-right cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => laborSort("estimatedPay")}
                  >
                    Cần trả <SortIcon active={laborKey === "estimatedPay"} dir={laborDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {laborLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      Đang tải...
                    </td>
                  </tr>
                ) : laborRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      Chưa có công Confirmed trong tháng {filter.month}/{filter.year}
                    </td>
                  </tr>
                ) : (
                  laborSorted.map((r, i) => (
                    <tr key={`${r.storeId}-${r.employeeId}`} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                      <td className="px-3 py-2 text-center text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{r.storeName}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.employeeName}</div>
                        <div className="text-xs font-mono text-gray-500">{r.employeeCode}</div>
                      </td>
                      <td className="px-3 py-2 text-center">{r.workedDays}</td>
                      <td className="px-3 py-2 text-center">{Number(r.workedHours).toFixed(1)}h</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {r.salaryType === "Monthly" ? "Tháng" : "Giờ"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {Number(r.estimatedPay).toLocaleString("en-US")} đ
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-blue-gray-100">
        <div className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Typography variant="h6" color="blue-gray">
              Báo cáo Chấm công (gom theo NV)
            </Typography>
            <FilterBar onReload={loadReport} reloadLabel="Xem báo cáo" />
          </div>
        </div>
        <CardBody className="p-0">
          <MobileListShell
            loading={loading}
            empty={!loading && summary.length === 0}
            emptyText='Nhấn "Xem báo cáo" để tải dữ liệu'
            count={summary.length || null}
          >
            {summary.map((s) => (
              <MobileCard key={s.employeeId}>
                <Typography variant="small" className="font-semibold">
                  {s.employeeName}
                </Typography>
                <Typography variant="small" color="gray" className="font-mono text-xs">
                  {s.employeeCode}
                </Typography>
                <MobileRow label="Ngày công">{s.workedDays}</MobileRow>
                <MobileRow label="Tổng giờ">{Number(s.workedHours).toFixed(1)}h</MobileRow>
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-2.5 text-center w-10">STT</th>
                  <th
                    className="px-4 py-2.5 text-left cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => handleSort("employeeCode")}
                  >
                    Mã NV <SortIcon active={sortKey === "employeeCode"} dir={sortDir} />
                  </th>
                  <th
                    className="px-4 py-2.5 text-left cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => handleSort("employeeName")}
                  >
                    Họ tên <SortIcon active={sortKey === "employeeName"} dir={sortDir} />
                  </th>
                  <th
                    className="px-4 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => handleSort("workedDays")}
                  >
                    Ngày công <SortIcon active={sortKey === "workedDays"} dir={sortDir} />
                  </th>
                  <th
                    className="px-4 py-2.5 text-center cursor-pointer select-none hover:bg-blue-700"
                    onClick={() => handleSort("workedHours")}
                  >
                    Tổng giờ <SortIcon active={sortKey === "workedHours"} dir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      Đang tải...
                    </td>
                  </tr>
                ) : summary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      Nhấn &quot;Xem báo cáo&quot; để tải dữ liệu
                    </td>
                  </tr>
                ) : (
                  sorted.map((s, i) => (
                    <tr key={s.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                      <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{s.employeeCode}</td>
                      <td className="px-4 py-2.5 font-medium">{s.employeeName}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{s.workedDays}</td>
                      <td className="px-4 py-2.5 text-center">{Number(s.workedHours).toFixed(1)}h</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-blue-gray-100">
        <div className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Typography variant="h6" color="blue-gray">
                Báo cáo BH tự trả
              </Typography>
              <Typography variant="small" color="gray">
                NV tự mua bảo hiểm — chi phí khai thuế
              </Typography>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filter.month}
                onChange={(e) => setFilter("month", e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Tháng {i + 1}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={filter.year}
                onChange={(e) => setFilter("year", e.target.value)}
                className="rounded-lg border border-blue-gray-200 px-2 py-2 text-sm w-20"
              />
              <Button size="sm" onClick={loadInsuranceReport}>
                Xem báo cáo BH
              </Button>
            </div>
          </div>
        </div>
        <CardBody className="p-0">
          <MobileListShell
            loading={insLoading}
            empty={!insLoading && insuranceReport.length === 0}
            emptyText='Nhấn "Xem báo cáo BH" để tải dữ liệu'
            count={insuranceReport.length || null}
          >
            {insuranceReport.map((r) => (
              <MobileCard key={r.employeeId}>
                <Typography variant="small" className="font-semibold">
                  {r.employeeName}
                </Typography>
                <Typography variant="small" color="gray" className="font-mono text-xs">
                  {r.employeeCode}
                </Typography>
                <MobileRow label="Số tiền">{Number(r.amount).toLocaleString("en-US")} đ</MobileRow>
                <MobileRow label="Ghi chú">{r.note || "—"}</MobileRow>
              </MobileCard>
            ))}
          </MobileListShell>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-600 text-white">
                  <th className="px-4 py-2.5 text-center w-10">STT</th>
                  <th
                    className="px-4 py-2.5 text-left cursor-pointer select-none hover:bg-emerald-700"
                    onClick={() => insHandleSort("employeeCode")}
                  >
                    Mã NV <SortIcon active={insSortKey === "employeeCode"} dir={insSortDir} />
                  </th>
                  <th
                    className="px-4 py-2.5 text-left cursor-pointer select-none hover:bg-emerald-700"
                    onClick={() => insHandleSort("employeeName")}
                  >
                    Họ tên <SortIcon active={insSortKey === "employeeName"} dir={insSortDir} />
                  </th>
                  <th
                    className="px-4 py-2.5 text-right cursor-pointer select-none hover:bg-emerald-700"
                    onClick={() => insHandleSort("amount")}
                  >
                    Chi phí tự trả <SortIcon active={insSortKey === "amount"} dir={insSortDir} />
                  </th>
                  <th className="px-4 py-2.5 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {insLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      Đang tải...
                    </td>
                  </tr>
                ) : insuranceReport.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      Nhấn &quot;Xem báo cáo BH&quot; để tải dữ liệu
                    </td>
                  </tr>
                ) : (
                  insSorted.map((r, i) => (
                    <tr key={r.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-emerald-50/30"}>
                      <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.employeeCode}</td>
                      <td className="px-4 py-2.5 font-medium">{r.employeeName}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                        {Number(r.amount).toLocaleString("en-US")} đ
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{r.note || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
