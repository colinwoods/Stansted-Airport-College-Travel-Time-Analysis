import { useApp } from "./state/AppState";
import MapView from "./map/MapView";
import Sidebar from "./panel/Sidebar";
import Legend from "./ui/Legend";
import Scatter from "./ui/Scatter";
import MapTitle from "./ui/MapTitle";
import SplitView from "./ui/SplitView";

function NorthArrow() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface/90 shadow-[0_8px_28px_rgba(0,0,0,0.5)] backdrop-blur">
      <svg width="16" height="16" viewBox="0 0 24 24" role="img" aria-label="North">
        <path d="M12 2 L16 13 L12 10 L8 13 Z" fill="#c4ccd4" />
        <text x="12" y="22" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7" fill="#8a96a0" aria-hidden="true">N</text>
      </svg>
    </div>
  );
}

function Splash({ text, error }: { text: string; error?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <div className="text-center">
        <div className="kicker">Stansted Airport College</div>
        <p className={["mt-2 font-display text-xl", error ? "text-accent" : "text-ink"].join(" ")}>{text}</p>
      </div>
    </div>
  );
}

export default function App() {
  const { loading, error, printMode, mode, splitView } = useApp();
  if (error) return <Splash text={`Could not load data — ${error}`} error />;
  if (loading) return <Splash text="Loading travel times…" />;
  if (splitView) return <SplitView />;

  return (
    <div className={["flex h-full w-full overflow-hidden", printMode && "printing"].filter(Boolean).join(" ")}>
      <Sidebar />
      <main className="relative min-w-0 flex-1 print-full">
        <MapView />

        {/* overlay layer: clicks pass through to the map except on the cards */}
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute left-4 top-4">
            <MapTitle />
          </div>
          {/* the scatter only earns its space in the comparison lens */}
          {mode === "diff" && (
            <div className="pointer-events-auto absolute right-4 top-4">
              <Scatter />
            </div>
          )}
          <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col items-end gap-2">
            <NorthArrow />
            <Legend />
          </div>
        </div>
      </main>
    </div>
  );
}
