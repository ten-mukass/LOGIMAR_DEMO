"use client"

import { useState } from "react"
import { Search, Filter, Download, MoreHorizontal, Eye, RefreshCw, XCircle, CheckCircle2 } from "lucide-react"

const MOCK_RESERVATIONS = [
    { id: "RES-9822", passenger: "Marie-Louise K.", route: "LBV → POG", date: "10 Mar · 07:30", seats: "1A, 1B", class: "Business", amount: 140000, status: "Payé", method: "Airtel" },
    { id: "RES-9821", passenger: "Jean-Marc Obame", route: "LBV → POG", date: "10 Mar · 07:30", seats: "14C", class: "Eco", amount: 35000, status: "Payé", method: "Airtel" },
    { id: "RES-9820", passenger: "Sarah Mboumba", route: "POG → LBV", date: "10 Mar · 13:00", seats: "5F", class: "Eco", amount: 35000, status: "Payé", method: "Moov" },
    { id: "RES-9819", passenger: "Pierre Nzouba", route: "LBV → POG", date: "10 Mar · 16:00", seats: "22A, 22B", class: "Eco", amount: 70000, status: "En attente", method: "Carte" },
    { id: "RES-9818", passenger: "Paul Biyoghe", route: "POG → LBV", date: "11 Mar · 08:30", seats: "4A", class: "Business", amount: 65000, status: "Annulé", method: "Moov" },
    { id: "RES-9817", passenger: "Vanessa Kinga", route: "LBV → POG", date: "10 Mar · 07:30", seats: "8D", class: "Eco", amount: 35000, status: "Payé", method: "Airtel" },
    { id: "RES-9816", passenger: "Luc Ondo", route: "LBV → POG", date: "10 Mar · 07:30", seats: "8E", class: "Eco", amount: 35000, status: "Payé", method: "Airtel" },
    { id: "RES-9815", passenger: "Sophie M.", route: "POG → LBV", date: "12 Mar · 13:00", seats: "2B", class: "Business", amount: 65000, status: "Payé", method: "Carte" },
]

export default function ReservationsPage() {
    const [searchTerm, setSearchTerm] = useState("")

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Réservations</h1>
                    <p className="text-slate-500">Gérez les billets et les demandes de remboursement.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-50">
                        <Download className="h-4 w-4" /> Exporter CSV
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white font-bold text-sm hover:bg-blue-700">
                        <RefreshCw className="h-4 w-4" /> Actualiser
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, ID ou téléphone..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-100">
                        <Filter className="h-4 w-4" /> Filtres
                    </button>
                    <select className="bg-slate-50 border border-slate-200 rounded-lg text-sm px-4 py-2 focus:outline-none font-medium text-slate-700 cursor-pointer">
                        <option>Tous les statuts</option>
                        <option>Payé (Confirmé)</option>
                        <option>En attente</option>
                        <option>Annulé</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">ID Réservation</th>
                                <th className="px-6 py-4">Passager</th>
                                <th className="px-6 py-4">Trajet & Date</th>
                                <th className="px-6 py-4">Détails</th>
                                <th className="px-6 py-4">Montant</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {MOCK_RESERVATIONS.map((res) => (
                                <tr key={res.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{res.id}</td>

                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{res.passenger}</div>
                                        <div className="text-xs text-slate-500">{res.method} Money</div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{res.route}</div>
                                        <div className="text-xs text-slate-500">{res.date}</div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${res.class === 'Business' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                                {res.class}
                                            </span>
                                            <span className="text-xs text-slate-500">Sièges: {res.seats}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 font-bold text-slate-900">
                                        {res.amount.toLocaleString('fr-FR')} FCFA
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            {res.status === 'Payé' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                            {res.status === 'Annulé' && <XCircle className="h-4 w-4 text-red-500" />}
                                            {res.status === 'En attente' && <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                                            <span className={`text-xs font-bold 
                                                ${res.status === 'Payé' ? 'text-emerald-700' :
                                                    res.status === 'En attente' ? 'text-amber-700' : 'text-red-700'}`}>
                                                {res.status}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>Affichage de 1-8 sur 42 réservations</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Précédent</button>
                        <button className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50">Suivant</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
