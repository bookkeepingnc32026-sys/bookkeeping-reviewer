import type { ReactNode } from "react";
import { PortalDataProvider } from "@/components/portal-data";

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <PortalDataProvider>{children}</PortalDataProvider>;
}
