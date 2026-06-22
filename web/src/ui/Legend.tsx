import { useApp } from "../state/AppState";
import { DIFF_NORM_STOPS, colorForCar, colorForTransit, sampleStops } from "../lib/scales";

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
      className="h-2.5 w-full rounded-full ring-1 ring-inset ring-black/10"
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

export default function Legend() {
  const { mode, data } = useApp();
  if (!data) return null;
  const { meta } = data;

  return (
    <div className="w-[260px] rounded-lg border border-hairline bg-surface/95 p-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.10)] backdrop-blur">
      {mode === "car" && (
        <>
          <div className="kicker mb-2">Drive time · arrive 09:00</div>
          <Bar css={gradient((t) => colorForCar(5 + t * 40))} />
          <Ticks labels={["5", "15", "25", "35", "45+ min"]} />
        </>
      )}

      {mode === "transit" && (
        <>
          <div className="kicker mb-2">Transit time · arrive 09:00</div>
          <Bar css={gradient((t) => colorForTransit(15 + t * 120))} />
          <Ticks labels={["15", "45", "75", "105", "135+ min"]} />
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
          <p className="mt-2.5 border-t border-hairline pt-2 font-sans text-[11px] leading-snug text-graphite">
            Thicker, brighter lines are the closest to competitive — the strongest
            switch candidates. {meta.n_no_transit + meta.n_transit_unrealistic} origins have
            no realistic 09:00 transit and are omitted.
          </p>
        </>
      )}
    </div>
  );
}
