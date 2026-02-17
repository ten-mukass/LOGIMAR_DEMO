"use client"

import { Zap, X } from "lucide-react"
import { useState } from "react"

export function DemoBanner() {
    const [isVisible, setIsVisible] = useState(true)

    if (!isVisible) return null

    return (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-[100] shadow-sm">
            <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 fill-current animate-pulse" />
                <span className="uppercase tracking-wide font-extrabold">DÉMONSTRATION - Données Fictives - Ne pas utiliser pour voyager</span>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-amber-600/20 rounded-full transition-colors"
                aria-label="Fermer"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}
