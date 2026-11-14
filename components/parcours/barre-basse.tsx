/** Barre fixée en bas de l'écran : total et action principale. */
export function BarreBasse({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-28" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-bordure bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 md:px-8">{children}</div>
      </div>
    </>
  )
}
