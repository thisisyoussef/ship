import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  FleetGraphDebugEntrySnapshot,
  FleetGraphDebugFindingSnapshot,
} from '@/lib/fleetgraph-debug';

interface FleetGraphDebugSurfaceValue {
  entry: FleetGraphDebugEntrySnapshot | null;
  findings: FleetGraphDebugFindingSnapshot[];
  setEntry: (entry: FleetGraphDebugEntrySnapshot | null) => void;
  setFindings: (findings: FleetGraphDebugFindingSnapshot[]) => void;
}

const noop = () => {};

const fallbackValue: FleetGraphDebugSurfaceValue = {
  entry: null,
  findings: [],
  setEntry: noop,
  setFindings: noop,
};

const FleetGraphDebugSurfaceContext =
  createContext<FleetGraphDebugSurfaceValue | null>(null);

export function FleetGraphDebugSurfaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [entry, setEntry] = useState<FleetGraphDebugEntrySnapshot | null>(null);
  const [findings, setFindings] = useState<FleetGraphDebugFindingSnapshot[]>([]);

  const value = useMemo(
    () => ({
      entry,
      findings,
      setEntry,
      setFindings,
    }),
    [entry, findings]
  );

  return (
    <FleetGraphDebugSurfaceContext.Provider value={value}>
      {children}
    </FleetGraphDebugSurfaceContext.Provider>
  );
}

export function useFleetGraphDebugSurface() {
  return useContext(FleetGraphDebugSurfaceContext) ?? fallbackValue;
}
