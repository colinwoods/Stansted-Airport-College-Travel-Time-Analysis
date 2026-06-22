import type { TransitStep } from "../data/types";

// One icon per journey leg, in order — e.g. [walk][bus][bus][walk]. The raw legs
// list is very granular (many consecutive walk sub-steps), so collapse runs of the
// same leg the way legs_summary does. Route number shows on hover via the title.

type Seg = { kind: "walk" } | { kind: "transit"; vehicle?: string; line?: string };

function compact(legs: TransitStep[] | undefined): Seg[] {
  const out: Seg[] = [];
  for (const l of legs ?? []) {
    const prev = out[out.length - 1];
    if (l.mode === "WALK") {
      if (prev?.kind === "walk") continue; // fold consecutive walks into one
      out.push({ kind: "walk" });
    } else if (l.mode === "TRANSIT") {
      const line = l.line ?? undefined;
      if (prev?.kind === "transit" && prev.line === line && prev.vehicle === (l.vehicle ?? undefined)) continue;
      out.push({ kind: "transit", vehicle: l.vehicle ?? undefined, line });
    }
  }
  return out;
}

const ICON = {
  width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round",
} as const;

function Glyph({ seg }: { seg: Seg }) {
  if (seg.kind === "walk") {
    return (
      <svg {...ICON}>
        <circle cx="13" cy="4" r="1" />
        <path d="M7 21l3-4" />
        <path d="M16 21l-2-4l-3-3l1-6" />
        <path d="M6 12l2-3l4-1l3 3l3 1" />
      </svg>
    );
  }
  if (seg.vehicle === "BUS") {
    return (
      <svg {...ICON}>
        <path d="M8 6v6M16 6v6M4 11h16M18 18h2a1 1 0 0 0 1-1V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a1 1 0 0 0 1 1h2" />
        <circle cx="7.5" cy="18" r="1.6" /><circle cx="16.5" cy="18" r="1.6" />
      </svg>
    );
  }
  // SUBWAY / HEAVY_RAIL / RAIL / TRAIN / LIGHT_RAIL / TRAM → rail glyph
  return (
    <svg {...ICON}>
      <rect x="5" y="3" width="14" height="13" rx="2.5" />
      <path d="M5 10h14M12 3v7M8.5 16l-2 4M15.5 16l2 4" />
      <path d="M8.5 13h.01M15.5 13h.01" />
    </svg>
  );
}

export default function TransitLegs({
  legs,
  summary,
}: {
  legs?: TransitStep[];
  summary?: string;
}) {
  const segs = compact(legs);
  if (!segs.length) {
    return <span className="truncate font-sans text-[11px] text-graphite">{summary || "—"}</span>;
  }
  return (
    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden" role="img" aria-label={summary}>
      {segs.map((s, i) => (
        <span
          key={i}
          title={s.kind === "walk" ? "Walk" : s.line ?? "Transit"}
          aria-hidden
          className={[
            "flex-none transition-colors",
            s.kind === "walk"
              ? "text-faint group-hover:text-graphite"
              : "text-graphite group-hover:text-ink",
          ].join(" ")}
        >
          <Glyph seg={s} />
        </span>
      ))}
    </span>
  );
}
