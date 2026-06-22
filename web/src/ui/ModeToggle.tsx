import { useApp } from "../state/AppState";
import type { Mode } from "../data/types";

const MODES: { id: Mode; label: string }[] = [
  { id: "car", label: "Car" },
  { id: "transit", label: "Transit" },
  { id: "diff", label: "Difference" },
];

export default function ModeToggle() {
  const { mode, setMode, setSelectedTripId } = useApp();
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-hairline bg-paper/60 p-1">
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id);
              setSelectedTripId(null); // a selection from another lens won't exist here
            }}
            aria-pressed={active}
            className={[
              "flex items-center justify-center rounded-md px-3 py-2.5 transition-colors",
              active
                ? "bg-accent text-paper shadow-[0_2px_12px_-4px_rgba(0,175,222,0.5)]"
                : "text-graphite hover:bg-surface-2 hover:text-ink",
            ].join(" ")}
          >
            <span className="font-sans text-[13px] font-semibold leading-tight">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
