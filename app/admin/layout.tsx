import type { Metadata } from "next"
import { CadreGestion } from "@/components/gestion/cadre-gestion"

export const metadata: Metadata = {
  title: { default: "Gestion", template: "%s — Gestion LOGIMAR 241" },
  robots: { index: false, follow: false },
}

export default function LayoutGestion({ children }: { children: React.ReactNode }) {
  return <CadreGestion>{children}</CadreGestion>
}
