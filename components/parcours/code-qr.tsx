import QRCode from "qrcode"

/** QR code dessiné en SVG (net à toutes les tailles, imprimable). */
export function CodeQr({ contenu, libelle, taille = 200 }: { contenu: string; libelle: string; taille?: number }) {
  const { modules } = QRCode.create(contenu, { errorCorrectionLevel: "M" })
  const marge = 2
  const cote = modules.size + marge * 2
  let chemin = ""
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (modules.get(y, x)) chemin += `M${x + marge} ${y + marge}h1v1h-1z`
    }
  }
  return (
    <svg
      role="img"
      aria-label={libelle}
      viewBox={`0 0 ${cote} ${cote}`}
      width={taille}
      height={taille}
      shapeRendering="crispEdges"
      className="bg-white"
    >
      <path d={chemin} fill="#12233B" />
    </svg>
  )
}
