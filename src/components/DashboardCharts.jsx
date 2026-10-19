const W = 360;
const H = 180;
const PAD = { t: 16, r: 12, b: 36, l: 44 };

function shortDateLabel(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr.slice(8, 10) || "";
}

function shortMoney(n) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(Math.round(v));
}

function ChartLegend({ items, compact = false, above = false }) {
  return (
    <div
      className={`flex flex-wrap gap-x-3 gap-y-1 ${
        above ? "mb-1.5 pb-1 border-b border-blue-gray-100" : compact ? "mt-1" : "mt-2"
      } text-[10px] text-blue-gray-700`}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1 whitespace-nowrap">
          {item.type === "line" ? (
            <span className="w-4 h-0.5 rounded shrink-0" style={{ backgroundColor: item.color }} />
          ) : (
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
          )}
          <span className="font-medium">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function xLabelIndices(count, compact) {
  if (count <= 1) return [0];
  if (!compact || count <= 5) return Array.from({ length: count }, (_, i) => i);
  const step = count > 7 ? 2 : 1;
  const idx = [];
  for (let i = 0; i < count; i += step) idx.push(i);
  if (idx[idx.length - 1] !== count - 1) idx.push(count - 1);
  return idx;
}

function scaleY(val, max, innerH) {
  if (max <= 0) return innerH;
  return innerH - (val / max) * innerH;
}

function polyPoints(values, max, innerW, innerH) {
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = PAD.l + i * step;
      const y = PAD.t + scaleY(v, max, innerH);
      return `${x},${y}`;
    })
    .join(" ");
}

/** Xu hướng 7 ngày — 4 đường % */
export function TrendLineChart({ days = [], compact = false }) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const series = days.map((d) => {
    const total = Math.max(1, Number(d.scheduled || d.present + d.absent || 0));
    const present = Number(d.present || 0);
    const late = Number(d.late || 0);
    const absent = Number(d.absent || 0);
    return {
      date: d.date,
      onTime: total > 0 ? Math.round(((present - late) / total) * 100) : 0,
      late: total > 0 ? Math.round((late / total) * 100) : 0,
      absent: total > 0 ? Math.round((absent / total) * 100) : 0,
      ot: 0,
    };
  });
  const max = 100;
  const lines = [
    { key: "onTime", color: "#22c55e", label: "Đúng giờ" },
    { key: "late", color: "#f59e0b", label: "Trễ" },
    { key: "absent", color: "#ef4444", label: "Vắng" },
  ];

  return (
    <div>
      <ChartLegend
        above
        compact={compact}
        items={lines.map((ln) => ({ type: "line", color: ln.color, label: ln.label }))}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${compact ? "h-[120px]" : "h-[200px]"}`}>
        {[0, 25, 50, 75, 100].map((g) => {
          const y = PAD.t + scaleY(g, max, innerH);
          return (
            <g key={g}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{g}%</text>
            </g>
          );
        })}
        {lines.map((ln) => (
          <polyline
            key={ln.key}
            fill="none"
            stroke={ln.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polyPoints(series.map((s) => s[ln.key]), max, innerW, innerH)}
          />
        ))}
        {xLabelIndices(series.length, compact).map((i) => {
          const s = series[i];
          const step = series.length > 1 ? innerW / (series.length - 1) : 0;
          const x = PAD.l + i * step;
          return (
            <text key={s.date} x={x} y={H - 10} textAnchor="middle" fontSize="8" fill="#64748b">
              {shortDateLabel(s.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** Chi phí nhân sự 7 ngày — cột + đường */
export function CostComboChart({ days = [], compact = false }) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const values = days.map((d) => ({
    date: d.date,
    est: Number(d.estimatedPay || 0),
    conf: Number(d.confirmedPay || 0),
  }));
  const maxMoney = Math.max(1, ...values.map((v) => Math.max(v.est, v.conf)));
  const barW = Math.max(8, innerW / Math.max(values.length, 1) - 8);

  return (
    <div>
      <ChartLegend
        above
        compact={compact}
        items={[
          { type: "bar", color: "#c4b5fd", label: "Dự kiến ca" },
          { type: "bar", color: "#86efac", label: "Cần trả" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${compact ? "h-[120px]" : "h-[200px]"}`}>
        {[0, 0.5, 1].map((r) => {
          const y = PAD.t + innerH * (1 - r);
          return (
            <g key={r}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8">
                {shortMoney(maxMoney * r)}
              </text>
            </g>
          );
        })}
        {values.map((v, i) => {
          const slot = innerW / Math.max(values.length, 1);
          const x = PAD.l + i * slot + (slot - barW) / 2;
          const hEst = (v.est / maxMoney) * innerH;
          const hConf = (v.conf / maxMoney) * innerH;
          return (
            <g key={v.date}>
              <rect x={x} y={PAD.t + innerH - hEst} width={barW * 0.45} height={hEst} rx="2" fill="#c4b5fd" />
              <rect x={x + barW * 0.5} y={PAD.t + innerH - hConf} width={barW * 0.45} height={hConf} rx="2" fill="#86efac" />
            </g>
          );
        })}
        {xLabelIndices(values.length, compact).map((i) => {
          const v = values[i];
          const slot = innerW / Math.max(values.length, 1);
          const x = PAD.l + i * slot + slot / 2;
          return (
            <text key={`${v.date}-lbl`} x={x} y={H - 10} textAnchor="middle" fontSize="8" fill="#64748b">
              {shortDateLabel(v.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** Gauge điểm vận hành */
export function ScoreGauge({ score = 0, onTimeRate = 0, staffingRate = 0, absenceRate = 0, overtimeRate = 0, compact = false }) {
  const pct = Math.max(0, Math.min(100, Number(score || 0)));
  const r = compact ? 40 : 54;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const label = pct >= 80 ? "Tốt" : pct >= 60 ? "Cần cải thiện" : "Cảnh báo";
  const size = compact ? 110 : 140;
  const cx = size / 2;

  return (
    <div className={`flex flex-col items-center ${compact ? "py-0" : ""}`}>
      <svg viewBox={`0 0 ${size} ${size}`} className={compact ? "w-24 h-24" : "w-36 h-36"}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth={compact ? 9 : 12} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={compact ? 9 : 12}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        <text x={cx} y={cx - (compact ? 2 : 6)} textAnchor="middle" fontSize={compact ? 20 : 28} fontWeight="800" fill="#0f172a">{pct}</text>
        <text x={cx} y={cx + (compact ? 12 : 16)} textAnchor="middle" fontSize={compact ? 8 : 10} fill="#64748b">/ 100</text>
      </svg>
      <p className={`font-semibold ${compact ? "text-[10px]" : "text-sm"}`} style={{ color }}>{label}</p>
      {!compact && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[10px] text-blue-gray-600 w-full">
          <span>Đúng giờ: <strong>{onTimeRate}%</strong></span>
          <span>Đủ ca: <strong>{staffingRate}%</strong></span>
          <span>Vắng: <strong>{absenceRate}%</strong></span>
        </div>
      )}
      {compact && (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[8px] text-blue-gray-500 w-full px-1">
          <span>Đúng giờ {onTimeRate}%</span>
          <span>Đủ ca {staffingRate}%</span>
          <span>Vắng {absenceRate}%</span>
        </div>
      )}
    </div>
  );
}

/** Thanh ngang theo cửa hàng */
export function StoreHoursBarChart({ items = [], compact = false, onItemClick }) {
  const max = Math.max(1, ...items.map((i) => i.hours));
  const colors = ["#22c55e", "#84cc16", "#f59e0b", "#fb923c", "#ef4444", "#94a3b8"];

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {items.map((x, i) => {
        const pct = Math.round((x.hours / max) * 100);
        const inner = (
          <>
            <div className="flex justify-between text-blue-gray-600 mb-0.5 gap-1">
              <span className="truncate font-medium" title={x.name}>{compact ? (x.name.length > 18 ? `${x.name.slice(0, 16)}…` : x.name) : x.name}</span>
              <span className="shrink-0">{x.hours.toFixed(1)}h</span>
            </div>
            <div className={`${compact ? "h-1.5" : "h-2.5"} rounded-full bg-slate-100 overflow-hidden`}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
              />
            </div>
          </>
        );
        if (!onItemClick) {
          return <div key={x.name} className={compact ? "text-[9px]" : "text-xs"}>{inner}</div>;
        }
        return (
          <button
            key={x.storeId || x.name}
            type="button"
            onClick={() => onItemClick(x)}
            className={`w-full text-left rounded px-0.5 -mx-0.5 hover:bg-blue-50 ${compact ? "text-[9px]" : "text-xs"}`}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

/** Mini sparkline cho KPI card */
export function Sparkline({ values = [], color = "#3b82f6" }) {
  if (!values.length) return null;
  const max = Math.max(1, ...values);
  const w = 60;
  const h = 24;
  const pad = 4;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + h - (v / max) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 72 28" className="w-[72px] h-7 opacity-80 shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  );
}
