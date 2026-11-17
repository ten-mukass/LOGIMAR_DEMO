import { Suspense } from "react"
import { EcranScan } from "@/components/embarquement/ecran-scan"

export default function PageScan() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-gris">Chargement…</p>}>
      <EcranScan />
    </Suspense>
  )
}
