import { useEffect, useRef, useState } from "react";
import { Dialog, DialogHeader, DialogBody, Typography, Button, Chip } from "@material-tailwind/react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrAttendanceScannerModal({ open, onClose, onScanSuccess, shiftInfo }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);
  const hasScannedRef = useRef(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  const scannerContainerId = "qr-attendance-reader";

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const stopScannerSafely = async () => {
    const inst = scannerRef.current;
    scannerRef.current = null;
    if (!inst) return;
    if (isRunningRef.current) {
      isRunningRef.current = false;
      try {
        await inst.stop();
      } catch {
        // ignore stop errors when camera stream already closed
      }
    }
    try {
      inst.clear();
    } catch {
      // ignore clear errors
    }
  };

  useEffect(() => {
    if (!open) {
      stopScannerSafely();
      return;
    }

    let cancelled = false;
    hasScannedRef.current = false;
    setError(null);

    const timer = setTimeout(async () => {
      if (cancelled) return;
      const container = document.getElementById(scannerContainerId);
      if (!container) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

            const config = {
              fps: 10,
              qrbox: { width: 240, height: 240 },
              aspectRatio: 1.0,
            };

            const onDecoded = async (decodedText) => {
              if (hasScannedRef.current || cancelled) return;
              hasScannedRef.current = true;
              await stopScannerSafely();
              if (!cancelled && onScanSuccessRef.current) {
                onScanSuccessRef.current(decodedText);
              }
    };

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        onDecoded,
        () => { }
      );
      if (cancelled) {
        isRunningRef.current = true;
        await stopScannerSafely();
        return;
      }
      isRunningRef.current = true;
    } catch {
      // Fallback sang camera trước / webcam laptop nếu thiết bị không có camera sau
      try {
        await html5QrCode.start(
          { facingMode: "user" },
          config,
          onDecoded,
          () => { }
        );
        if (cancelled) {
          isRunningRef.current = true;
          await stopScannerSafely();
          return;
        }
        isRunningRef.current = true;
      } catch {
        if (!cancelled) {
          setError("Không thể mở camera. Vui lòng cấp quyền truy cập camera trên trình duyệt (yêu cầu HTTPS hoặc localhost).");
        }
      }
    }
  }, 150);

  return () => {
    cancelled = true;
    clearTimeout(timer);
    stopScannerSafely();
  };
  }, [open]);

  const handleClose = async () => {
    await stopScannerSafely();
    onClose();
  };

  const isCheckOut = shiftInfo?.action === "check-out";

  return (
    <Dialog open={open} handler={handleClose} size="xs" className="p-2 max-w-sm mx-auto">
        <DialogHeader className="flex items-start justify-between pb-2 border-b gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Typography variant="h6" color="blue-gray">Quét mã QR Chấm công</Typography>
              {shiftInfo?.action && (
                <Chip
                  size="sm"
                  color={isCheckOut ? "blue" : "green"}
                  value={isCheckOut ? "Kết thúc ca" : "Vào ca"}
                  className="normal-case py-0.5 px-2 text-[11px]"
                />
              )}
            </div>
            {shiftInfo && (
            <Typography variant="small" className="text-gray-500 font-normal text-xs mt-0.5">
              {shiftInfo.storeName} ({shiftInfo.startTime} – {shiftInfo.endTime})
            </Typography>
          )}
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 leading-none"
        >
          ×
        </button>
      </DialogHeader>
        <DialogBody className="pt-3 pb-2 text-center">
          {error ? (
            <div className="py-6 text-red-600 text-sm">
              <p className="font-semibold mb-2">⚠️ Lỗi Camera</p>
              <p className="text-xs text-gray-600 mb-4">{error}</p>
              <Button size="sm" color="blue-gray" onClick={handleClose}>
                Đóng
              </Button>
            </div>
          ) : (
            <div>
              <div
                id={scannerContainerId}
                className="w-full overflow-hidden rounded-xl border border-gray-200 bg-black min-h-[260px]"
              />
              <p className="text-xs text-blue-gray-600 mt-3">
                Hướng camera vào mã QR động đang hiển thị trên <strong>máy POS</strong> tại quán để{" "}
                <strong>{isCheckOut ? "kết thúc ca" : "vào ca"}</strong>.
              </p>
            </div>
          )}
        </DialogBody>
    </Dialog>
  );
}
