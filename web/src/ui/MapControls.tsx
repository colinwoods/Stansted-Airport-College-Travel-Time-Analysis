// Bottom-left map chrome: zoom in/out + a reset that re-frames the full data
// extent. Presentational — MapView wires the callbacks to the live map.
export default function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center text-graphite transition-colors hover:bg-surface-2 hover:text-ink";
  const card =
    "border border-hairline bg-surface/90 shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur";

  return (
    <div className="no-print pointer-events-auto absolute bottom-12 left-4 flex flex-col gap-2">
      <div className={`flex flex-col overflow-hidden rounded-lg ${card}`}>
        <button type="button" onClick={onZoomIn} className={btn} aria-label="Zoom in" title="Zoom in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className={`${btn} border-t border-hairline`}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        onClick={onReset}
        className={`${btn} rounded-lg ${card}`}
        aria-label="Reset view to full extent"
        title="Reset view"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>
    </div>
  );
}
