"use client"

import { useState } from "react"
import { Calendar, TrendingUp, DollarSign, Percent, ArrowRight, Zap, Grip } from "lucide-react"

const PRICING_RULES = [
    { id: 1, name: "Early Bird", condition: "J-14 avant départ", action: "-15% sur Eco", active: true },
    { id: 2, name: "Yield High Season", condition: "Remplissage > 70%", action: "+10% sur Business", active: true },
    { id: 3, name: "Last Minute", condition: "J-2 avant départ", action: "+20% sur Tout", active: false },
]

export default function YieldPage() {
    const [basePrice, setBasePrice] = useState(35000)

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-blue-600" /> Yield Management
                    </h1>
                    <p className="text-slate-500">Ajustement dynamique des prix pour maximiser le revenu.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white font-bold text-sm hover:bg-blue-700">
                        <Zap className="h-4 w-4" /> Appliquer les Règles
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Simulator Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="font-bold text-slate-900 mb-6">Simulateur de Prix</h2>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-bold text-slate-500">Prix de Base (Eco)</label>
                                    <span className="text-sm font-bold text-blue-600">{basePrice.toLocaleString()} FCFA</span>
                                </div>
                                <input
                                    type="range"
                                    min="25000"
                                    max="50000"
                                    step="1000"
                                    value={basePrice}
                                    onChange={(e) => setBasePrice(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between mt-1 text-xs text-slate-400">
                                    <span>25k</span>
                                    <span>50k</span>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Revenu Projeté (Jour)</p>
                                <p className="text-2xl font-bold text-emerald-600">{(basePrice * 450).toLocaleString()} FCFA</p>
                                <p className="text-xs text-slate-500 mt-1">Basé sur 450 réservations moy.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="font-bold text-slate-900 mb-4">Règles Actives</h2>
                        <div className="space-y-3">
                            {PRICING_RULES.map((rule) => (
                                <div key={rule.id} className={`p-3 rounded-xl border ${rule.active ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50 opacity-60'} flex justify-between items-center`}>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">{rule.name}</p>
                                        <p className="text-xs text-slate-500">{rule.condition} → <span className="font-bold">{rule.action}</span></p>
                                    </div>
                                    <div className={`w-8 h-5 rounded-full p-1 transition-colors ${rule.active ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'} flex items-center`}>
                                        <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                                    </div>
                                </div>
                            ))}
                            <button className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 hover:border-slate-400 transition-colors">
                                + Ajouter une règle
                            </button>
                        </div>
                    </div>
                </div>

                {/* Calendar View */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-slate-400" /> Mars 2026
                        </h2>
                        <div className="flex gap-2 text-sm">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Bas</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Normal</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Haut</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">{day}</div>
                        ))}
                        {Array.from({ length: 31 }).map((_, i) => {
                            const day = i + 1
                            // Simulate demand
                            const demand = day % 7 > 4 ? 'high' : (day % 3 === 0 ? 'normal' : 'low')
                            const price = demand === 'high' ? 45000 : (demand === 'normal' ? 35000 : 28000)
                            const color = demand === 'high' ? 'bg-amber-50 border-amber-200 text-amber-700' : (demand === 'normal' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700')

                            return (
                                <div key={day} className={`aspect-square rounded-xl border p-2 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer ${color}`}>
                                    <span className="text-xs font-bold">{day}</span>
                                    <div className="text-right">
                                        <p className="text-[10px] font-medium opacity-80">dès</p>
                                        <p className="text-xs font-bold">{price / 1000}k</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
