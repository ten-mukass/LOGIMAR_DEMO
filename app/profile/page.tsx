"use client"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { User, Settings, CreditCard, HelpCircle, LogOut } from "lucide-react"

export default function ProfilePage() {
    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <SiteHeader />
            <div className="container px-4 py-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">Mon Profil</h1>

                {/* User Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex items-center gap-4">
                    <div className="bg-slate-100 p-4 rounded-full">
                        <User className="h-8 w-8 text-slate-500" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900">Utilisateur Invité</h2>
                        <p className="text-sm text-slate-500">Connectez-vous pour voir vos infos</p>
                    </div>
                </div>

                {/* Menu */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
                        <User className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Informations personnelles</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
                        <CreditCard className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Paiements</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
                        <Settings className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Paramètres</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
                        <HelpCircle className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Aide & Support</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors text-left text-red-600">
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Déconnexion</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
