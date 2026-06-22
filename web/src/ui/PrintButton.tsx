import { useApp } from "../state/AppState";

export default function PrintButton() {
  const { setPrintMode } = useApp();

  const onPrint = () => {
    setPrintMode(true);
    const done = () => {
      setPrintMode(false);
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    // two frames so the collapsed layout + map.resize() settle before the dialog
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  return (
    <button
      onClick={onPrint}
      className="group flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-surface transition-transform hover:-translate-y-px active:translate-y-0"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
      </svg>
      Print map (A3)
    </button>
  );
}
