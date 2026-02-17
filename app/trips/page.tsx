"use client"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Ticket, QrCode, Download, Share2, MapPin, CalendarDays, Ship, Briefcase, ShieldCheck, Zap } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

export default function TripsPage() {
    const searchParams = useSearchParams()
    const showSuccess = searchParams.get('success') === 'true'
    const hasPriority = searchParams.get('priority') === 'true'
    const hasInsurance = searchParams.get('insurance') === 'true'
    const extraLuggage = parseInt(searchParams.get('luggage') || '0')

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <SiteHeader />
            <div className="container px-4 py-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">Mes Billets</h1>

                {showSuccess ? (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 max-w-md mx-auto relative group">
                        {/* Success Banner */}
                        <div className="bg-emerald-500 p-4 text-center text-white">
                            <p className="font-bold text-lg flex items-center justify-center gap-2">
                                <Ticket className="h-5 w-5" /> Réservation Confirmée
                            </p>
                        </div>

                        {/* Ticket Body */}
                        <div className="p-6 relative">
                            {/* Holes for ticket look */}
                            <div className="absolute -left-4 top-1/2 w-8 h-8 bg-slate-50 rounded-full"></div>
                            <div className="absolute -right-4 top-1/2 w-8 h-8 bg-slate-50 rounded-full"></div>
                            <div className="border-b-2 border-dashed border-slate-200 pb-6 mb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">LBV <Ship className="h-5 w-5 text-slate-300" /> POG</h2>
                                        <p className="text-sm text-slate-500 font-medium mt-1">Logimar Express I</p>
                                    </div>
                                    <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        Business
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-slate-50 p-3 rounded-xl text-center">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Départ</p>
                                        <p className="text-lg font-bold text-slate-900">07:30</p>
                                        <p className="text-xs text-slate-500">10 Mars</p>
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-3 rounded-xl text-center">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Siège</p>
                                        <p className="text-lg font-bold text-slate-900">1A</p>
                                        <p className="text-xs text-slate-500">Fenêtre</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center mb-6">
                                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                    <QrCode className="h-32 w-32 text-slate-900" />
                                </div>
                            </div>
                            <p className="text-center text-xs text-slate-400 mb-6">Présentez ce QR code à l'embarquement</p>

                            {/* Added Options */}
                            {(hasPriority || hasInsurance || extraLuggage > 0) && (
                                <div className="mb-6 pt-4 border-t border-dashed border-slate-200 grid grid-cols-2 gap-2">
                                    {hasPriority && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                            <Zap className="h-3 w-3" /> PRIORITAIRE
                                        </div>
                                    )}
                                    {hasInsurance && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                            <ShieldCheck className="h-3 w-3" /> ASSURANCE
                                        </div>
                                    )}
                                    {extraLuggage > 0 && (
                                        <div className={cn("flex items-center gap-2 text-[10px] font-bold text-slate-700 bg-slate-100 p-2 rounded-lg border border-slate-200", hasPriority && hasInsurance ? "col-span-2" : "")}>
                                            <Briefcase className="h-3 w-3" /> {extraLuggage} BAGAGE(S) SUPP.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="w-full gap-2">
                                    <Download className="h-4 w-4" /> PDF
                                </Button>
                                <Button variant="outline" className="w-full gap-2">
                                    <Share2 className="h-4 w-4" /> Partager
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100 flex flex-col items-center">
                        <div className="bg-blue-50 p-4 rounded-full mb-4">
                            <Ticket className="h-8 w-8 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">Aucun voyage à venir</h2>
                        <p className="text-slate-500 mb-6">Vous n'avez pas encore de billets réservés.</p>
                        <Button asChild>
                            <Link href="/search">Réserver un voyage</Link>
                        </Button>
                    </div>
                )}

            </div>
        </div>
    )
}
