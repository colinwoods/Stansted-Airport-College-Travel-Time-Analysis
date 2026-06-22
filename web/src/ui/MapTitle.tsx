import { useMemo } from "react";
import { useApp } from "../state/AppState";
import { modeLabel } from "../lib/format";

export default function MapTitle() {
  const { data, mode } = useApp();
  const dateLabel = useMemo(() => {
    if (!data) return "";
    const d = new Date(`${data.meta.target_date}T09:00:00`);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(d);
  }, [data]);
  if (!data) return null;

  return (
    <div className="max-w-[340px] rounded-lg border border-hairline bg-surface/92 px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.10)] backdrop-blur">
      <div className="kicker">Travel Time Atlas · Modal Shift Study</div>
      <h2 className="mt-1.5 font-display text-[21px] font-semibold leading-none tracking-tight text-ink">
        {data.meta.destination.name}
      </h2>
      <p className="mt-2 font-mono text-[10.5px] uppercase tracking-wide text-graphite">
        <span className="text-accent">{modeLabel(mode)}</span> · arrive by 09:00 · {dateLabel}
      </p>
    </div>
  );
}
