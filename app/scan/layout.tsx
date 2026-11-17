import type { Metadata } from "next"
import { CadreScan } from "@/components/embarquement/cadre-scan"

export const metadata: Metadata = {
  title: { absolute: "Embarquement — LOGIMAR 241" },
  robots: { index: false, follow: false },
}

export default function LayoutScan({ children }: { children: React.ReactNode }) {
  return <CadreScan>{children}</CadreScan>
}
