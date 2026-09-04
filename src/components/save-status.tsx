"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SaveState = "idle" | "pending" | "saving" | "error";

type SaveStatusValue = {
  state: SaveState;
  setState: (state: SaveState) => void;
};

const SaveStatusContext = createContext<SaveStatusValue | null>(null);

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaveState>("idle");
  const value = useMemo(() => ({ state, setState }), [state]);
  return (
    <SaveStatusContext.Provider value={value}>
      {children}
    </SaveStatusContext.Provider>
  );
}

export function useSaveStatus(): SaveStatusValue {
  const ctx = useContext(SaveStatusContext);
  if (!ctx) {
    throw new Error("useSaveStatus must be used within SaveStatusProvider");
  }
  return ctx;
}
