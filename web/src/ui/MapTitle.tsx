import { useMemo } from "react";
import { useApp } from "../state/AppState";
import { modeLabel } from "../lib/format";

// A slim context strip — the sidebar already carries the title, so the map only
// needs the active lens + the arrival assumption + date for orientation / print.
export default function MapTitle() {
  const { data, mode } = useApp();
  const dateLabel = useMemo(() => {
    if (!data) return "";
    const d = new Date(`${data.meta.target_date}T09:00:00`);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
  }, [data]);
  if (!data) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface/85 px-3.5 py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-section text-accent">
        {modeLabel(mode)}
      </span>
      <span className="h-3 w-px bg-hairline" />
      <span className="font-mono text-[10px] uppercase tracking-section text-graphite">
        arrive 09:00 · {dateLabel}
      </span>
    </div>
  );
}
