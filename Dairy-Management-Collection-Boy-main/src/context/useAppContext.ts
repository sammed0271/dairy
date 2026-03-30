// src/context/useAppContext.ts
import { useContext } from "react";
import { AppContext } from "./AppContext";
import type { AppContextValue } from "./AppContext";

export const useAppContext = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used inside <AppProvider>");
  }
  return ctx;
};
