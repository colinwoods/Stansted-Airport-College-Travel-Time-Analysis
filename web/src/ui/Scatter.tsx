import { useMemo } from "react";
import { useApp } from "../state/AppState";
import { colorForDiff } from "../lib/scales";

const SIZE = 232;
const PAD = 30;

export default function Scatter() {
  const { data, mode, selectedTripId, setSelectedTripId, setHoveredTripId } = useApp();

  const pts = useMemo(
    () =>
      (data?.origins ?? []).filter(
        (o) => o.transit_realistic && o.car_min != null && o.transit_min != null,
      ),
    [data],
  );

  if (!data) return null;
  const domain = data.meta.diff_domain_min;

  const max = Math.max(
    60,
    Math.ceil(Math.max(...pts.map((p) => Math.max(p.car_min!, p.transit_min!))) / 20) * 20,
  );
  const sx = (v: number) => PAD + (v / max) * (SIZE - PAD - 8);
  const sy = (v: number) => SIZE - PAD - (v / max) * (SIZE - PAD - 8);
  const ticks = Array.from({ length: max / 30 + 1 }, (_, i) => i * 30);
  const selOrigin = selectedTripId?.replace(/-(car|transit)$/, "");
  const idFor = (oid: string) => `${oid}-${mode === "transit" ? "transit" : "car"}`;

  return (
    <div className="w-[268px] rounded-lg border border-hairline bg-surface/95 p-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.10)] backdrop-blur">
      <div className="kicker mb-1">Drive vs transit · minutes</div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" role="img">
        {/* switch zone: below the diagonal = transit faster than car */}
        <polygon
          points={`${sx(0)},${sy(0)} ${sx(max)},${sy(max)} ${sx(max)},${sy(0)}`}
          fill="#0e4f59"
          opacity={0.05}
        />
        {/* axes */}
        <line x1={PAD} y1={sy(0)} x2={sx(max)} y2={sy(0)} stroke="#16130f" strokeWidth={1} />
        <line x1={PAD} y1={sy(0)} x2={PAD} y2={sy(max)} stroke="#16130f" strokeWidth={1} />
        {/* parity diagonal */}
        <line
          x1={sx(0)} y1={sy(0)} x2={sx(max)} y2={sy(max)}
          stroke="#6f685d" strokeWidth={1} strokeDasharray="3 3"
        />
        {ticks.map((t) => (
          <g key={t}>
            <text x={sx(t)} y={SIZE - PAD + 12} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize={8} fill="#6f685d">{t}</text>
            <text x={PAD - 6} y={sy(t) + 3} textAnchor="end"
              fontFamily="var(--font-mono)" fontSize={8} fill="#6f685d">{t}</text>
          </g>
        ))}
        <text x={sx(max)} y={sy(max) - 5} textAnchor="end"
          fontFamily="var(--font-mono)" fontSize={8} fill="#6f685d">transit = car</text>

        {pts.map((p) => {
          const sel = selOrigin === p.originId;
          return (
            <circle
              key={p.originId}
              cx={sx(p.car_min!)} cy={sy(p.transit_min!)}
              r={sel ? 5.5 : 3.2}
              fill={colorForDiff(p.diff_min!, domain)}
              stroke={sel ? "#d6402a" : "#16130f"}
              strokeWidth={sel ? 2 : 0.5}
              opacity={selOrigin && !sel ? 0.35 : 0.92}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedTripId(idFor(p.originId))}
              onMouseEnter={() => setHoveredTripId(idFor(p.originId))}
              onMouseLeave={() => setHoveredTripId(null)}
            />
          );
        })}
      </svg>
      <div className="mt-1 text-center font-mono text-[8px] uppercase tracking-wider text-faint">
        x · drive min → y · transit min
      </div>
    </div>
  );
}
