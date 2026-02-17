"use client"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Check, MessageCircle, Share2, Download } from "lucide-react"
import Link from "next/link"

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <SiteHeader />

            <div className="container px-4 py-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto min-h-[80vh]">

                <div className="bg-white p-8 rounded-3xl shadow-xl w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500"></div>

                    <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                        <Check className="h-10 w-10" />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Paiement Réussi !</h1>
                    <p className="text-slate-500 mb-8">Votre réservation est confirmée.</p>

                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 text-left">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                                {/* QR Code Placeholder */}
                                <div className="h-8 w-8 bg-slate-900"></div>
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">Billet Électronique</p>
                                <p className="text-xs text-slate-500">Ref: LGM-88291</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
                            <MessageCircle className="h-4 w-4" />
                            Envoyé sur WhatsApp au +241 07...
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button className="w-full gap-2 rounded-xl h-12 text-base" variant="outline">
                            <Download className="h-4 w-4" /> Télécharger PDF
                        </Button>
                        <Button className="w-full gap-2 rounded-xl h-12 text-base" variant="secondary">
                            <Share2 className="h-4 w-4" /> Partager le trajet
                        </Button>
                        <Link href="/" className="block">
                            <Button variant="link" className="text-slate-500 mt-2">Retour à l'accueil</Button>
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    )
}
