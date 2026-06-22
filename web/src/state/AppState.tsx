import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRoutes, type RoutesData } from "../data/useRoutes";
import type { Mode } from "../data/types";

interface AppState {
  data: RoutesData | null;
  loading: boolean;
  error: string | null;
  mode: Mode;
  setMode: (m: Mode) => void;
  selectedTripId: string | null;
  setSelectedTripId: (id: string | null) => void;
  hoveredTripId: string | null;
  setHoveredTripId: (id: string | null) => void;
  printMode: boolean;
  setPrintMode: (v: boolean) => void;
  splitView: boolean;
  setSplitView: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useRoutes();
  const [mode, setMode] = useState<Mode>("diff");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [splitView, setSplitView] = useState(false);

  const value = useMemo<AppState>(
    () => ({
      data, loading, error,
      mode, setMode,
      selectedTripId, setSelectedTripId,
      hoveredTripId, setHoveredTripId,
      printMode, setPrintMode,
      splitView, setSplitView,
    }),
    [data, loading, error, mode, selectedTripId, hoveredTripId, printMode, splitView],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppStateProvider");
  return v;
}
