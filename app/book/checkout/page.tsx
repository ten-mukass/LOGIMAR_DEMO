"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { ArrowLeft, Ticket, CreditCard, ShieldCheck, ArrowRight, Briefcase, Zap, Info, Smartphone, Plus, Minus } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

const CheckoutContent = () => {
    const searchParams = useSearchParams()
    const router = useRouter()

    const seats = searchParams.get('seats')?.split(',') || []
    const travelClass = searchParams.get('class')
    const passengersCount = seats.length || 1

    // State for Upsells
    const [hasPriority, setHasPriority] = useState(false)
    const [hasInsurance, setHasInsurance] = useState(false)
    const [extraLuggage, setExtraLuggage] = useState(0)

    // Pricing Constants (Mock)
    const BASE_UNIT_PRICE = travelClass === 'business' ? 65000 : 35000
    const BASE_PRICE = BASE_UNIT_PRICE * passengersCount

    const PRICE_PRIORITY = 5000 // Per person
    const PRICE_INSURANCE = 2500 // Per person
    const PRICE_LUGGAGE = 10000 // Per bag

    // Total Calculation
    const costPriority = hasPriority ? (PRICE_PRIORITY * passengersCount) : 0
    const costInsurance = hasInsurance ? (PRICE_INSURANCE * passengersCount) : 0
    const costLuggage = extraLuggage * PRICE_LUGGAGE

    const totalOptions = costPriority + costInsurance + costLuggage
    const totalPrice = BASE_PRICE + totalOptions

    const handlePayment = () => {
        router.push(`/trips?success=true&priority=${hasPriority}&insurance=${hasInsurance}&luggage=${extraLuggage}`)
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            <SiteHeader />

            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-sm">
                <div className="container px-4 py-4 flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Paiement</h1>
                        <p className="text-xs text-slate-500">Confirmez votre réservation</p>
                    </div>
                </div>
            </div>

            <div className="container px-4 py-8 max-w-2xl mx-auto space-y-6">

                {/* Summary Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Départ</p>
                                <p className="text-xl font-bold">Libreville (LBV)</p>
                                <p className="text-slate-400 text-sm">10 Mars • 07:30</p>
                            </div>
                            <Ticket className="h-8 w-8 text-slate-700" />
                        </div>
                        <div className="flex justify-between items-end border-t border-slate-700 pt-4">
                            <div>
                                <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Arrivée</p>
                                <p className="text-lg font-bold">Port-Gentil (POG)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-400 font-bold text-3xl">{totalPrice.toLocaleString('fr-FR')}</p>
                                <p className="text-slate-400 text-xs text-right">FCFA Total à payer</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-500 font-medium text-sm">Billet ({passengersCount})</span>
                            <span className="font-bold text-slate-900">{BASE_PRICE.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        {hasPriority && (
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-emerald-600">
                                <span className="font-medium text-sm flex items-center gap-2"><Zap className="h-3 w-3" /> Voyageur Prioritaire</span>
                                <span className="font-bold">+{costPriority.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                        )}
                        {hasInsurance && (
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-emerald-600">
                                <span className="font-medium text-sm flex items-center gap-2"><ShieldCheck className="h-3 w-3" /> Assurance Voyage</span>
                                <span className="font-bold">+{costInsurance.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                        )}
                        {extraLuggage > 0 && (
                            <div className="flex justify-between items-center py-2 border-b border-slate-100 text-emerald-600">
                                <span className="font-medium text-sm flex items-center gap-2"><Briefcase className="h-3 w-3" /> {extraLuggage} Bagage(s) Supp.</span>
                                <span className="font-bold">+{costLuggage.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upsell Options */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" /> Options de Voyage
                    </h2>

                    {/* Priority */}
                    <label className={cn("flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer", hasPriority ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300")}>
                        <div className="pt-1">
                            <input type="checkbox" checked={hasPriority} onChange={(e) => setHasPriority(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-900">Voyageur Prioritaire</span>
                                <span className="text-sm font-bold text-slate-900">+{PRICE_PRIORITY.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <p className="text-sm text-slate-500">Ne faites pas la file. Embarquement prioritaire et accès rapide au navire.</p>
                        </div>
                    </label>

                    {/* Insurance */}
                    <label className={cn("flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer", hasInsurance ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300")}>
                        <div className="pt-1">
                            <input type="checkbox" checked={hasInsurance} onChange={(e) => setHasInsurance(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-900">Assurance Voyage</span>
                                <span className="text-sm font-bold text-slate-900">+{PRICE_INSURANCE.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <p className="text-sm text-slate-500">Remboursement à 100% en cas d'annulation ou de modification jusqu'à 2h avant le départ.</p>
                        </div>
                    </label>

                    {/* Luggage */}
                    <div className="p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="font-bold text-slate-900 flex items-center gap-2"><Briefcase className="h-4 w-4" /> Bagages Supplémentaires</span>
                                <p className="text-sm text-slate-500 mt-1">23kg par bagage supplémentaire.</p>
                            </div>
                            <span className="text-sm font-bold text-slate-900">+{PRICE_LUGGAGE.toLocaleString('fr-FR')} /unité</span>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-lg w-fit">
                            <button
                                onClick={() => setExtraLuggage(Math.max(0, extraLuggage - 1))}
                                className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                            ><Minus className="h-4 w-4" /></button>
                            <span className="font-bold w-4 text-center">{extraLuggage}</span>
                            <button
                                onClick={() => setExtraLuggage(Math.min(5, extraLuggage + 1))}
                                className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                            ><Plus className="h-4 w-4" /></button>
                        </div>

                        {/* Luggage Policy Info */}
                        <div className="mt-4 flex gap-3 bg-blue-50 p-3 rounded-lg text-blue-700 text-xs">
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <p>
                                <span className="font-bold">Inclus gratuitement :</span> 1 bagage en soute (23kg) + 1 bagage cabine (10kg) par passager. <br />
                                Tout excédent sera facturé.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Passenger Form (Localized) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-blue-500" /> Vos Coordonnées
                    </h2>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Numéro de Téléphone (Airtel / Moov)</label>
                            <div className="flex gap-2">
                                <span className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 font-medium flex items-center">+241</span>
                                <input type="tel" placeholder="074 XX XX XX" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-bold" autoFocus />
                            </div>
                            <p className="text-[10px] text-slate-400">Votre billet sera envoyé par SMS.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nom</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Prénom</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900" />
                            </div>
                        </div>
                        <button className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Ajouter une adresse email (optionnel)
                        </button>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payer {totalPrice.toLocaleString('fr-FR')} FCFA</p>

                    <button onClick={handlePayment} className="w-full bg-white border border-slate-200 hover:border-red-500/50 hover:bg-red-50 p-4 rounded-xl flex items-center justify-between group transition-all">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">AM</div>
                            <span className="font-bold text-slate-900">Airtel Money</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-red-500 transition-colors" />
                    </button>

                    <button onClick={handlePayment} className="w-full bg-white border border-slate-200 hover:border-yellow-500/50 hover:bg-yellow-50 p-4 rounded-xl flex items-center justify-between group transition-all">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">MM</div>
                            <span className="font-bold text-slate-900">Moov Money</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-yellow-500 transition-colors" />
                    </button>

                    <button onClick={handlePayment} className="w-full bg-white border border-slate-200 hover:border-blue-500/50 hover:bg-blue-50 p-4 rounded-xl flex items-center justify-between group transition-all">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-slate-900">Carte Bancaire</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                </div>

            </div>
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Chargement...</div>}>
            <CheckoutContent />
        </Suspense>
    )
}
