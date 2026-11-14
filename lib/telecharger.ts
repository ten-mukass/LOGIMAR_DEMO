/** Propose un fichier généré dans le navigateur au téléchargement. */
export function telecharger(octets: Uint8Array, nom: string, type = "application/pdf"): void {
  const url = URL.createObjectURL(new Blob([octets as BlobPart], { type }))
  const lien = document.createElement("a")
  lien.href = url
  lien.download = nom
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
