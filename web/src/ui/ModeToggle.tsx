import { useApp } from "../state/AppState";
import type { Mode } from "../data/types";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "car", label: "Car", hint: "Drive time" },
  { id: "transit", label: "Transit", hint: "Public transport" },
  { id: "diff", label: "Difference", hint: "Car vs transit" },
];

export default function ModeToggle() {
  const { mode, setMode } = useApp();
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-hairline bg-paper/60 p-1">
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            aria-pressed={active}
            className={[
              "group flex flex-col items-start rounded-md px-3 py-2 text-left transition-colors",
              active ? "bg-ink text-surface shadow-sm" : "text-graphite hover:bg-surface",
            ].join(" ")}
          >
            <span className="font-sans text-[13px] font-semibold leading-tight">{m.label}</span>
            <span
              className={[
                "mt-0.5 font-mono text-[9px] uppercase tracking-wider",
                active ? "text-surface/70" : "text-faint",
              ].join(" ")}
            >
              {m.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
