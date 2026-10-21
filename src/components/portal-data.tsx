"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Bootstrap } from "@/lib/types";

type PortalData = {
  data: Bootstrap | null;
  setData: Dispatch<SetStateAction<Bootstrap | null>>;
};

const PortalDataContext = createContext<PortalData | null>(null);

// Keep the loaded profile and progress in the shared route layout. This state
// survives section navigation, and is discarded when leaving this portal.
export function PortalDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const value = useMemo(() => ({ data, setData }), [data]);
  return (
    <PortalDataContext.Provider value={value}>
      {children}
    </PortalDataContext.Provider>
  );
}

export function usePortalData() {
  const context = useContext(PortalDataContext);
  if (!context) throw new Error("Portal pages require PortalDataProvider.");
  return context;
}
