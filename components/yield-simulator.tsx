"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, DollarSign, AlertCircle } from "lucide-react"

export function YieldSimulator() {
    // State for parameters
    const [occupancyThreshold, setOccupancyThreshold] = useState(30) // %
    const [daysBeforeDeparture, setDaysBeforeDeparture] = useState(7)
    const [priceAdjustment, setPriceAdjustment] = useState(-20) // %

    // Simulated Metrics
    const baseRevenue = 2500000 // FCFA
    const optimizedRevenue = baseRevenue * (1 + (Math.abs(priceAdjustment) * 0.01 * 0.8) + (occupancyThreshold * 0.005))
    const additionalRevenue = optimizedRevenue - baseRevenue

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Simulateur Yield Management</h2>
                    <p className="text-slate-400 text-sm">Configurez vos règles de tarification dynamique</p>
                </div>
                <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30 animate-pulse">
                    IA ACTIVE
                </div>
            </div>

            <div className="grid lg:grid-cols-2">
                {/* Configuration Panel */}
                <div className="p-8 border-b lg:border-b-0 lg:border-r border-slate-100 space-y-8">

                    {/* Rule 1 */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="font-semibold text-slate-700">Seuil de Remplissage Bas</label>
                            <span className="text-blue-600 font-bold">{occupancyThreshold}%</span>
                        </div>
                        <input
                            type="range"
                            min="10" max="90"
                            value={occupancyThreshold}
                            onChange={(e) => setOccupancyThreshold(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-slate-500">Si le remplissage est inférieur à {occupancyThreshold}%...</p>
                    </div>

                    {/* Rule 2 */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="font-semibold text-slate-700">Délai avant départ</label>
                            <span className="text-blue-600 font-bold">J-{daysBeforeDeparture}</span>
                        </div>
                        <input
                            type="range"
                            min="1" max="30"
                            value={daysBeforeDeparture}
                            onChange={(e) => setDaysBeforeDeparture(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-slate-500">...à {daysBeforeDeparture} jours du départ...</p>
                    </div>

                    {/* Action */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="font-semibold text-slate-700">Ajustement Tarifaire</label>
                            <span className={priceAdjustment < 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                                {priceAdjustment > 0 ? "+" : ""}{priceAdjustment}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="-50" max="50"
                            value={priceAdjustment}
                            onChange={(e) => setPriceAdjustment(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <p className="text-xs text-slate-500">
                            ...alors <span className="font-bold">baisser le prix de {Math.abs(priceAdjustment)}%</span> pour stimuler la demande.
                        </p>
                    </div>

                </div>

                {/* Result Panel */}
                <div className="p-8 bg-slate-50 flex flex-col justify-center relative overflow-hidden">

                    {/* Background decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Impact Financier (Projeté)</h3>

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                <DollarSign className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Revenu Sans Yield</p>
                                <p className="text-xl font-bold text-slate-700">{baseRevenue.toLocaleString()} FCFA</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-500/20">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm text-emerald-600 font-semibold">Revenu Optimisé Estimé</p>
                                <p className="text-3xl font-bold text-slate-900">{Math.round(optimizedRevenue).toLocaleString()} FCFA</p>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-slate-600">Gain Net Additionnel</span>
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">+ {((additionalRevenue / baseRevenue) * 100).toFixed(1)}%</span>
                            </div>
                            <p className="text-4xl font-black text-emerald-500 tracking-tight">
                                + {Math.round(additionalRevenue).toLocaleString()} <span className="text-lg text-slate-400 font-normal">FCFA</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-2">Par traversée (Moyenne)</p>
                        </div>
                    </div>

                    <Button className="w-full mt-8" size="lg" variant="default">
                        Appliquer cette règle
                    </Button>
                </div>
            </div>
        </div>
    )
}
