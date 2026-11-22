import { useState, useEffect, useMemo } from "react";
import { Button, Typography } from "@material-tailwind/react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

const DELIVERY_RATE = 8000;

function formatMoney(n) {
  return Number(n || 0).toLocaleString("vi-VN") + " đ";
}

export default function PayrollAllowanceModal({
  open,
  detail,
  canEdit,
  isAdmin,
  onClose,
  onSave,
}) {
  const [items, setItems] = useState([]);
  const [deliveryTrips, setDeliveryTrips] = useState(0);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !detail) return;

    const rawAllowances = Array.isArray(detail.allowances) ? detail.allowances : [];
    const delItem = rawAllowances.find((a) => a.code === "DELIVERY");
    const otherItems = rawAllowances.filter((a) => a.code !== "DELIVERY");

    if (delItem) {
      setDeliveryTrips(delItem.quantity ?? 0);
      setDeliveryNote(delItem.note || "");
    } else if (Number(detail.deliveryAllowance) > 0) {
      // Legacy fallback nếu trước đây nhập thẳng tiền
      const estTrips = Math.round(Number(detail.deliveryAllowance) / DELIVERY_RATE);
      setDeliveryTrips(estTrips);
      setDeliveryNote("");
    } else {
      setDeliveryTrips(0);
      setDeliveryNote("");
    }

    setItems(
      otherItems.map((o, idx) => ({
        id: o.id || `tmp-${idx}`,
        code: o.code || "OTHER",
        name: o.name || "Phụ cấp khác",
        calculationType: o.calculationType || "Fixed",
        quantity: o.quantity || 1,
        unitPrice: o.unitPrice || o.amount || 0,
        amount: o.amount || 0,
        note: o.note || "",
      }))
    );
  }, [open, detail]);

  const deliveryAmount = useMemo(() => {
    return Math.max(0, Number(deliveryTrips || 0)) * DELIVERY_RATE;
  }, [deliveryTrips]);

  const otherTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [items]);

  const grandTotal = deliveryAmount + otherTotal;

  if (!open || !detail) return null;

  const handleAddOther = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        code: "OTHER",
        name: "",
        calculationType: "Fixed",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        note: "",
      },
    ]);
  };

  const handleUpdateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const cur = { ...next[index], [field]: value };
      if (field === "amount" || field === "unitPrice") {
        const num = Math.max(0, Number(String(value).replace(/[^0-9]/g, "")) || 0);
        cur.amount = num;
        cur.unitPrice = num;
      }
      next[index] = cur;
      return next;
    });
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const payload = [];
      const tripsNum = Math.max(0, Number(deliveryTrips || 0));
      if (tripsNum > 0 || deliveryNote) {
        payload.push({
          code: "DELIVERY",
          name: "Giao hàng",
          calculationType: "PerUnit",
          quantity: tripsNum,
          unitPrice: DELIVERY_RATE,
          amount: tripsNum * DELIVERY_RATE,
          note: deliveryNote || null,
        });
      }

      items.forEach((item) => {
        const amt = Number(item.amount || 0);
        if (amt > 0 || item.name) {
          payload.push({
            code: item.code || "OTHER",
            name: item.name || "Phụ cấp khác",
            calculationType: "Fixed",
            quantity: 1,
            unitPrice: amt,
            amount: amt,
            note: item.note || null,
          });
        }
      });

      await onSave(payload);
      onClose();
    } catch (err) {
      alert(err?.message || "Lỗi lưu phụ cấp");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/50">
      <div className="relative bg-white w-full max-w-lg rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <Typography variant="h6" color="blue-gray" className="text-base font-bold">
              Chi tiết phụ cấp
            </Typography>
            <Typography variant="small" color="gray" className="text-xs">
              {detail.employeeName} ({detail.employeeCode})
            </Typography>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Đóng"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Phụ cấp giao hàng */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-900">1. Phụ cấp giao hàng</span>
              <span className="text-xs text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded font-mono">
                {formatMoney(DELIVERY_RATE)}/lượt
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32">
                <label className="text-[11px] text-gray-600 block mb-0.5">Số lượt giao</label>
                {canEdit ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="w-full text-center rounded border border-blue-gray-200 px-2 py-1.5 text-sm font-bold bg-white focus:outline-blue-500"
                    value={deliveryTrips === 0 ? "" : deliveryTrips}
                    placeholder="0"
                    onChange={(ev) => setDeliveryTrips(ev.target.value)}
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-800 py-1">{deliveryTrips} lượt</p>
                )}
              </div>

              <div className="flex-1 text-right">
                <span className="text-[11px] text-gray-500 block">Thành tiền</span>
                <span className="text-base font-bold text-blue-800">
                  {formatMoney(deliveryAmount)}
                </span>
              </div>
            </div>

            {canEdit ? (
              <input
                type="text"
                placeholder="Ghi chú đơn giao hàng (tùy chọn)"
                className="w-full text-xs rounded border border-blue-gray-200 px-2 py-1 bg-white"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
              />
            ) : deliveryNote ? (
              <p className="text-xs text-gray-600 italic">Ghi chú: {deliveryNote}</p>
            ) : null}
          </div>

          {/* Phụ cấp khác (Mở rộng) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">2. Khoản phụ cấp khác</span>
              {canEdit && isAdmin && (
                <button
                  type="button"
                  onClick={handleAddOther}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <PlusIcon className="w-3.5 h-3.5" /> Thêm khoản
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-1">Không có khoản phụ cấp khác.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        {canEdit && isAdmin ? (
                          <input
                            type="text"
                            placeholder="Tên khoản (vd: Gửi xe, Cơm trưa...)"
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                          />
                        ) : (
                          <span className="font-semibold text-gray-800">{item.name || "Phụ cấp khác"}</span>
                        )}
                      </div>

                      <div className="w-28">
                        {canEdit && isAdmin ? (
                          <input
                            type="text"
                            placeholder="Số tiền"
                            className="w-full text-right rounded border border-gray-300 px-2 py-1 text-xs font-semibold"
                            value={item.amount ? Number(item.amount).toLocaleString("vi-VN") : ""}
                            onChange={(e) => handleUpdateItem(idx, "amount", e.target.value)}
                          />
                        ) : (
                          <span className="font-bold text-gray-800 block text-right">
                            {formatMoney(item.amount)}
                          </span>
                        )}
                      </div>

                      {canEdit && isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Xóa"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {canEdit && isAdmin ? (
                      <input
                        type="text"
                        placeholder="Lý do / Ghi chú"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600"
                        value={item.note}
                        onChange={(e) => handleUpdateItem(idx, "note", e.target.value)}
                      />
                    ) : item.note ? (
                      <p className="text-[11px] text-gray-500 italic">Lý do: {item.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tổng cộng */}
          <div className="p-3 bg-blue-gray-50 rounded-lg flex items-center justify-between text-sm font-semibold">
            <span className="text-blue-gray-800">TỔNG PHỤ CẤP:</span>
            <span className="text-base text-blue-900 font-bold">{formatMoney(grandTotal)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t flex justify-end gap-2">
          <Button size="sm" variant="outlined" color="blue-gray" className="normal-case text-xs" onClick={onClose}>
            {canEdit ? "Hủy" : "Đóng"}
          </Button>
          {canEdit && (
            <Button size="sm" color="blue" className="normal-case text-xs" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu phụ cấp"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

