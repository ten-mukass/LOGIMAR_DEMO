import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { default: "Gestion", template: "%s — Gestion LOGIMAR 241" },
  robots: { index: false, follow: false },
}

export default function LayoutComptes({ children }: { children: React.ReactNode }) {
  return children
}
