"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Ship, LayoutDashboard, CalendarRange, TrendingUp, Users, Anchor, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const navigation = [
        { name: "Vue d'ensemble", href: "/admin", icon: LayoutDashboard },
        { name: "Réservations", href: "/admin/reservations", icon: CalendarRange },
        { name: "Yield Management", href: "/admin/yield", icon: TrendingUp },
        { name: "Passagers", href: "/admin/passengers", icon: Users },
        { name: "Gestion Flotte", href: "/admin/fleet", icon: Anchor }, // Placeholder for visual consistency
    ]

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-50">
                {/* Brand */}
                <div className="flex items-center gap-2 p-6 border-b border-slate-800">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Ship className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">Logimar<span className="text-blue-400">.admin</span></span>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer User */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="h-9 w-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-slate-900">JS</div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold truncate">Jean S.</p>
                            <p className="text-xs text-slate-500 truncate">Super Admin</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg transition-colors">
                            <Settings className="h-3 w-3" /> Param.
                        </button>
                        <button className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold py-2 rounded-lg transition-colors">
                            <LogOut className="h-3 w-3" /> Sortir
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header (Visible only on mobile) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1 rounded-lg">
                        <Ship className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold tracking-tight">Logimar<span className="text-blue-400">.admin</span></span>
                </div>
                {/* We mock a menu button here, real mobile nav would require state */}
                <div className="p-2 bg-slate-800 rounded-md">
                    <LayoutDashboard className="h-5 w-5" />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen">
                {children}
            </main>
        </div>
    )
}
