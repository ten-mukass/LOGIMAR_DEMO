"use client"

import { useState } from "react"
import { Search, User, Mail, Phone, MapPin, Award, MoreHorizontal, ArrowUpRight } from "lucide-react"

const MOCK_PASSENGERS = [
    { id: 1, name: "Jean-Marc Obame", email: "jm.obame@gmail.com", phone: "+241 077 45 23 12", trips: 14, spent: 850000, status: "Gold", lastTrip: "Hier" },
    { id: 2, name: "Sarah Mboumba", email: "s.mboumba@yahoo.fr", phone: "+241 066 12 98 45", trips: 8, spent: 320000, status: "Silver", lastTrip: "Il y a 3j" },
    { id: 3, name: "Pierre Nzouba", email: "p.nzouba@orange.ga", phone: "+241 074 56 78 90", trips: 3, spent: 105000, status: "Bronze", lastTrip: "Semaine dernière" },
    { id: 4, name: "Vanessa Kinga", email: "v.kinga@gmail.com", phone: "+241 062 34 56 78", trips: 22, spent: 1450000, status: "Platinum", lastTrip: "Il y a 2 sem" },
    { id: 5, name: "Luc Ondo", email: "luc.ondo@gmail.com", phone: "+241 077 11 22 33", trips: 1, spent: 35000, status: "Bronze", lastTrip: "Mois dernier" },
]

export default function PassengersPage() {
    return (
        <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <User className="h-6 w-6 text-blue-600" /> Passagers
                    </h1>
                    <p className="text-slate-500">Base de données clients et programme de fidélité.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-bold text-slate-500 uppercase">Total Clients</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">12,450</p>
                    <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 mt-2">
                        <ArrowUpRight className="h-4 w-4" /> +120 cette semaine
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-bold text-slate-500 uppercase">Membres Gold</p>
                    <p className="text-3xl font-bold text-amber-500 mt-2">342</p>
                    <p className="text-xs text-slate-400 mt-2">Clients haute contribution</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-bold text-slate-500 uppercase">Panier Moyen</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">42,500 <span className="text-sm text-slate-400">FCFA</span></p>
                    <p className="text-xs text-slate-400 mt-2">Par transaction</p>
                </div>
            </div>

            {/* Search & List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un passager..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        Filtres Avancés
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Nom / Contact</th>
                                <th className="px-6 py-4">Statut Fidélité</th>
                                <th className="px-6 py-4">Voyages</th>
                                <th className="px-6 py-4">Dépenses Totales</th>
                                <th className="px-6 py-4">Dernier Voyage</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {MOCK_PASSENGERS.map((passenger) => (
                                <tr key={passenger.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                {passenger.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{passenger.name}</div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {passenger.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                                            ${passenger.status === 'Platinum' ? 'bg-slate-900 text-white' :
                                                passenger.status === 'Gold' ? 'bg-amber-100 text-amber-800' :
                                                    passenger.status === 'Silver' ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-800'}`}>
                                            <Award className="h-3 w-3" /> {passenger.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700">{passenger.trips}</td>
                                    <td className="px-6 py-4 font-bold text-emerald-600">{passenger.spent.toLocaleString()} FCFA</td>
                                    <td className="px-6 py-4 text-slate-500">{passenger.lastTrip}</td>
                                    <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
