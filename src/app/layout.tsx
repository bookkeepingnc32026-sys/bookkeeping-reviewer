import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Bookkeep — Bookkeeping NC III Reviewer",
    template: "%s · Bookkeep",
  },
  description:
    "Build your bookkeeping confidence. Structured lessons, hands-on practice, and mock assessments for your NC III learning journey.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
