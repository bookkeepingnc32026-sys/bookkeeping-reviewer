import type { ReactNode } from "react";
import { PortalDataProvider } from "@/components/portal-data";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <PortalDataProvider>{children}</PortalDataProvider>;
}
