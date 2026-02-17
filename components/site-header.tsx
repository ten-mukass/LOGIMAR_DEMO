import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Ship, Menu } from "lucide-react"

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Ship className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">Logimar<span className="text-blue-600">.booking</span></span>
                </Link>

                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                    <Link href="#" className="hover:text-blue-600 transition-colors">Horaires</Link>
                    <Link href="#" className="hover:text-blue-600 transition-colors">Mes Réservations</Link>
                    <Link href="#" className="hover:text-blue-600 transition-colors">Contact</Link>
                </nav>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="hidden md:flex">Connexion</Button>

                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    )
}
