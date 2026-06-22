import { useApp } from "../state/AppState";
import { DIFF_NORM_STOPS, colorForDuration, sampleStops } from "../lib/scales";
import type { Mode } from "../data/types";

function gradient(sampler: (t: number) => string, steps = 28): string {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    parts.push(`${sampler(t)} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

function Bar({ css }: { css: string }) {
  return (
    <div
      className="h-2.5 w-full rounded-full ring-1 ring-inset ring-white/10"
      style={{ background: css }}
    />
  );
}

function Ticks({ labels }: { labels: string[] }) {
  return (
    <div className="mt-1.5 flex justify-between font-mono text-[9px] text-graphite">
      {labels.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}

export default function Legend({
  compact = false,
  modeOverride,
}: {
  compact?: boolean;
  modeOverride?: Mode;
}) {
  const { mode: globalMode, data } = useApp();
  const mode = modeOverride ?? globalMode;
  if (!data) return null;
  const { meta } = data;

  const width = compact ? "w-[208px]" : "w-[260px]";

  return (
    <div
      className={`${width} rounded-lg border border-hairline bg-surface/95 p-3.5 shadow-[0_10px_34px_rgba(0,0,0,0.5)] backdrop-blur`}
    >
      {(mode === "car" || mode === "transit") && (
        <>
          <div className="kicker mb-2">Journey time · shared scale</div>
          <Bar css={gradient((t) => colorForDuration(5 + t * 130))} />
          <Ticks labels={["15", "45", "75", "105", "135+ min"]} />
          {!compact && (
            <p className="mt-2.5 border-t border-hairline pt-2 font-sans text-[11px] leading-snug text-graphite">
              Car and transit share one colour scale, so a fast trip looks the same
              either way — which is why most transit lines run hot.
            </p>
          )}
        </>
      )}

      {mode === "diff" && (
        <>
          <div className="kicker mb-2">Car vs transit · time gap</div>
          <Bar css={gradient((t) => sampleStops(DIFF_NORM_STOPS, t * 2 - 1))} />
          <div className="mt-1.5 flex justify-between font-mono text-[9px] text-graphite">
            <span>← Car faster</span>
            <span>Same</span>
            <span>Transit faster →</span>
          </div>
          {!compact && (
            <p className="mt-2.5 border-t border-hairline pt-2 font-sans text-[11px] leading-snug text-graphite">
              Thicker, brighter lines are the closest to competitive — the strongest
              switch candidates. {meta.n_no_transit + meta.n_transit_unrealistic} origins have
              no realistic 09:00 transit and are omitted.
            </p>
          )}
        </>
      )}
    </div>
  );
}
