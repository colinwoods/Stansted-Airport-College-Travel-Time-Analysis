import { useApp } from "../state/AppState";

// Map overlay action: drop into the synced car-vs-transit split view.
export default function CompareButton() {
  const { setSplitView } = useApp();
  return (
    <button
      type="button"
      onClick={() => setSplitView(true)}
      aria-label="Compare car and transit side by side"
      title="Compare side by side"
      className="no-print flex items-center gap-2 rounded-full border border-hairline bg-surface/85 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-section text-graphite shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur transition-colors hover:border-accent hover:text-ink"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="7" height="16" rx="1" />
        <rect x="14" y="4" width="7" height="16" rx="1" />
      </svg>
      Compare
    </button>
  );
}
