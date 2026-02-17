"use client"

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { Users, CreditCard, TrendingUp, Ship, Calendar, Search, Bell, Menu, ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react"

// Mock Data
const REVENUE_DATA = [
    { day: "Lun", value: 1250000, height: "60%" },
    { day: "Mar", value: 1850000, height: "85%" },
    { day: "Mer", value: 1500000, height: "70%" },
    { day: "Jeu", value: 950000, height: "45%" },
    { day: "Ven", value: 2100000, height: "95%" },
    { day: "Sam", value: 2450000, height: "100%" },
    { day: "Dim", value: 1900000, height: "80%" },
]

const RECENT_TRANSACTIONS = [
    { id: "#TRX-9821", passenger: "Jean-Marc Obame", route: "LBV → POG", amount: 75000, status: "Payé", date: "À l'instant", method: "Airtel Money" },
    { id: "#TRX-9820", passenger: "Sarah Mboumba", route: "POG → LBV", amount: 35000, status: "Payé", date: "Il y a 2 min", method: "Moov Money" },
    { id: "#TRX-9819", passenger: "Pierre Nzouba", route: "LBV → POG", amount: 45000, status: "En attente", date: "Il y a 5 min", method: "Carte Bancaire" },
    { id: "#TRX-9818", passenger: "Vanessa K.", route: "LBV → POG", amount: 35000, status: "Payé", date: "Il y a 12 min", method: "Airtel Money" },
    { id: "#TRX-9817", passenger: "Paul Biyoghe", route: "POG → LBV", amount: 35000, status: "Annulé", date: "Il y a 15 min", method: "Moov Money" },
]

export default function AdminDashboard() {
    return (
        <div className="p-6 md:p-8 space-y-8">

            {/* Intro */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Tableau de Bord</h1>
                <p className="text-slate-500">Vue d'ensemble de l'activité du mardi 10 mars.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Chiffre d'Affaires</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">2.45M <span className="text-sm font-normal text-slate-400">FCFA</span></h3>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>+12.5%</span>
                        <span className="text-slate-400 font-normal ml-1">vs hier</span>
                    </div>
                </div>

                {/* Passengers Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Passagers (Jour)</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">482 <span className="text-sm font-normal text-slate-400">pers.</span></h3>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>+5.2%</span>
                        <span className="text-slate-400 font-normal ml-1">vs hier</span>
                    </div>
                </div>

                {/* Occupancy Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Taux Remplissage</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">78% <span className="text-sm font-normal text-slate-400">moy.</span></h3>
                        </div>
                        <div className="bg-amber-50 p-2 rounded-lg">
                            <Ship className="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-red-500">
                        <ArrowDownRight className="h-4 w-4" />
                        <span>-2.1%</span>
                        <span className="text-slate-400 font-normal ml-1">vs hier</span>
                    </div>
                </div>
            </div>

            {/* Charts & Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Weekly Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-bold text-slate-900 text-lg">Revenus Hebdomadaire</h3>
                        <button className="text-sm font-bold text-blue-600 border border-blue-100 bg-blue-50 px-3 py-1 rounded-lg">Voir Tout</button>
                    </div>

                    {/* Simple CSS Chart */}
                    <div className="h-64 flex items-end justify-between gap-2 md:gap-4 px-2">
                        {REVENUE_DATA.map((item, index) => (
                            <div key={index} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                                <div className="relative w-full bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end hover:bg-slate-200 transition-colors">
                                    <div
                                        className="w-full bg-blue-600 rounded-t-lg transition-all duration-500 group-hover:bg-blue-500 relative"
                                        style={{ height: item.height }}
                                    >
                                        {/* Tooltip on Hover */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {(item.value / 1000000).toFixed(2)}M
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-400">{item.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions / Status */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 text-lg mb-6">État des Navires</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">Logimar Express I</p>
                                    <p className="text-xs text-slate-500">En route vers POG</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-900">10:30 ETA</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">Logimar Queen</p>
                                    <p className="text-xs text-slate-500">À quai (Maintenance)</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-900">--:--</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">Logimar Express II</p>
                                    <p className="text-xs text-slate-500">Embarquement (LBV)</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-900">16:00 DEP</span>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h4 className="font-bold text-slate-900 text-sm mb-4">Accès Rapide</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="p-3 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100 transition-colors text-center">
                                Nouveau Billet
                            </button>
                            <button className="p-3 bg-slate-50 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors text-center">
                                Gestion Flotte
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-lg">Transactions Récentes</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 md:w-64" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">ID Transaction</th>
                                <th className="px-6 py-4">Passager</th>
                                <th className="px-6 py-4">Trajet</th>
                                <th className="px-6 py-4">Montant</th>
                                <th className="px-6 py-4">Méthode</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {RECENT_TRANSACTIONS.map((trx) => (
                                <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{trx.id}</td>
                                    <td className="px-6 py-4 text-slate-600">{trx.passenger}</td>
                                    <td className="px-6 py-4 text-slate-600">{trx.route}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{trx.amount.toLocaleString('fr-FR')} FCFA</td>
                                    <td className="px-6 py-4 text-slate-500">{trx.method}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                                                ${trx.status === 'Payé' ? 'bg-emerald-100 text-emerald-800' :
                                                trx.status === 'En attente' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                            {trx.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-slate-600">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                    <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Voir toutes les transactions</button>
                </div>
            </div>

        </div>
    )
}
