import { useMemo } from "react";
import { useApp } from "../state/AppState";
import { colorForDiff } from "../lib/scales";

// viewBox geometry with explicit margins so each axis has room for its title
const W = 248;
const H = 252;
const ML = 44; // left margin: y tick labels + rotated y title
const MR = 12;
const MT = 12;
const MB = 44; // bottom margin: x tick labels + x title
const PLOT_W = W - ML - MR;
const PLOT_H = H - MT - MB;

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
  const sx = (v: number) => ML + (v / max) * PLOT_W;
  const sy = (v: number) => H - MB - (v / max) * PLOT_H;
  const ticks = Array.from({ length: max / 30 + 1 }, (_, i) => i * 30);
  const selOrigin = selectedTripId?.replace(/-(car|transit)$/, "");
  const idFor = (oid: string) => `${oid}-${mode === "transit" ? "transit" : "car"}`;

  // angle of the parity diagonal, so the "transit = car" note can run along it
  const parityAngle = (Math.atan2(sy(max) - sy(0), sx(max) - sx(0)) * 180) / Math.PI;
  const px = sx(max * 0.64) + 12;
  const py = sy(max * 0.64) + 11;

  return (
    <div className="w-[268px] rounded-lg border border-hairline bg-surface/95 p-3.5 shadow-[0_10px_34px_rgba(0,0,0,0.5)] backdrop-blur">
      <div className="kicker mb-1">Drive vs transit</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Drive time versus transit time, one point per origin. Every point sits above the parity diagonal, meaning driving is faster everywhere. Select a journey from the list on the left to inspect it."
      >
        {/* switch zone: below the diagonal = transit faster than car */}
        <polygon
          points={`${sx(0)},${sy(0)} ${sx(max)},${sy(max)} ${sx(max)},${sy(0)}`}
          fill="#00afde"
          opacity={0.08}
        />
        {/* axes */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(max)} y2={sy(0)} stroke="#4a555f" strokeWidth={1} />
        <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(max)} stroke="#4a555f" strokeWidth={1} />
        {/* parity diagonal */}
        <line
          x1={sx(0)} y1={sy(0)} x2={sx(max)} y2={sy(max)}
          stroke="#7c8893" strokeWidth={1} strokeDasharray="3 3"
        />
        {ticks.map((t) => (
          <g key={t}>
            <text x={sx(t)} y={H - MB + 13} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize={8} fill="#8a96a0">{t}</text>
            <text x={ML - 7} y={sy(t) + 3} textAnchor="end"
              fontFamily="var(--font-mono)" fontSize={8} fill="#8a96a0">{t}</text>
          </g>
        ))}

        {/* parity-line annotation, running along the dashed diagonal */}
        <text
          x={px} y={py} textAnchor="middle"
          transform={`rotate(${parityAngle} ${px} ${py})`}
          fontFamily="var(--font-mono)" fontSize={8} fill="#8a96a0"
        >
          transit = car
        </text>

        {pts.map((p) => {
          const sel = selOrigin === p.originId;
          return (
            <circle
              key={p.originId}
              cx={sx(p.car_min!)} cy={sy(p.transit_min!)}
              r={sel ? 5.5 : 3.2}
              fill={colorForDiff(p.diff_min!, domain)}
              stroke={sel ? "#00afde" : "#0d1217"}
              strokeWidth={sel ? 2 : 0.5}
              opacity={selOrigin && !sel ? 0.4 : 0.95}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedTripId(idFor(p.originId))}
              onMouseEnter={() => setHoveredTripId(idFor(p.originId))}
              onMouseLeave={() => setHoveredTripId(null)}
            />
          );
        })}

        {/* axis titles */}
        <text
          x={ML + PLOT_W / 2} y={H - 5} textAnchor="middle"
          fontFamily="var(--font-mono)" fontSize={9} fontWeight={600} fill="#c4ccd4"
          letterSpacing="0.04em"
        >
          DRIVE TIME (MIN)
        </text>
        <text
          x={13} y={MT + PLOT_H / 2} textAnchor="middle"
          transform={`rotate(-90 13 ${MT + PLOT_H / 2})`}
          fontFamily="var(--font-mono)" fontSize={9} fontWeight={600} fill="#c4ccd4"
          letterSpacing="0.04em"
        >
          TRANSIT TIME (MIN)
        </text>
      </svg>
    </div>
  );
}
