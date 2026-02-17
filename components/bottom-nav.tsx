"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Ship, CalendarDays, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
    const pathname = usePathname()

    const isActive = (path: string) => pathname === path

    // Hide bottom nav on Admin and Scan pages (they have their own navigation or are standalone)
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/scan')) {
        return null
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-center z-50 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Link href="/" className={cn("flex flex-col items-center gap-1 transition-colors", isActive('/') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600')}>
                <Home className={cn("h-6 w-6", isActive('/') && "fill-current")} />
                <span className="text-[10px] font-medium">Accueil</span>
            </Link>
            <Link href="/search" className={cn("flex flex-col items-center gap-1 transition-colors", isActive('/search') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600')}>
                <Ship className={cn("h-6 w-6", isActive('/search') && "fill-current")} />
                <span className="text-[10px] font-medium">Réserver</span>
            </Link>
            <Link href="/trips" className={cn("flex flex-col items-center gap-1 transition-colors", isActive('/trips') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600')}>
                <CalendarDays className={cn("h-6 w-6", isActive('/trips') && "fill-current")} />
                <span className="text-[10px] font-medium">Billets</span>
            </Link>
            <Link href="/profile" className={cn("flex flex-col items-center gap-1 transition-colors", isActive('/profile') ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600')}>
                <User className={cn("h-6 w-6", isActive('/profile') && "fill-current")} />
                <span className="text-[10px] font-medium">Profil</span>
            </Link>
        </div>
    )
}
