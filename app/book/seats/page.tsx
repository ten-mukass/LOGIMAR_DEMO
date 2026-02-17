"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, Armchair, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Suspense } from "react"

// Mock Boat Layout
// Business: Rows 1-2 (2-2 layout)
// Eco: Rows 3-10 (3-3 layout)

const SeatSelectionContent = () => {
    const searchParams = useSearchParams()
    const router = useRouter()

    const tripId = searchParams.get('tripId')
    const travelClass = searchParams.get('class') === 'business' ? 'business' : 'eco'
    const tripType = searchParams.get('type')
    const passengersCount = 1 // Default 1 for prototype simplicity

    const [selectedSeats, setSelectedSeats] = useState<string[]>([])

    const toggleSeat = (seatId: string) => {
        if (selectedSeats.includes(seatId)) {
            setSelectedSeats(selectedSeats.filter(s => s !== seatId))
        } else {
            if (selectedSeats.length < passengersCount) {
                setSelectedSeats([...selectedSeats, seatId])
            } else {
                // Replace the last selection if limit reached (common UX for single pax)
                setSelectedSeats([seatId])
            }
        }
    }

    const renderSeat = (row: number, col: string, type: 'business' | 'eco') => {
        const seatId = `${row}${col}`
        const isSelected = selectedSeats.includes(seatId)
        const isOccupied = Math.random() < 0.3 // Mock occupancy

        return (
            <button
                key={seatId}
                disabled={isOccupied}
                onClick={() => toggleSeat(seatId)}
                className={cn(
                    "relative flex items-center justify-center rounded-t-lg transition-all",
                    // Shape & Size
                    type === 'business' ? "w-12 h-12 m-1" : "w-8 h-8 m-0.5",
                    // Colors
                    isOccupied ? "bg-slate-200 cursor-not-allowed" :
                        isSelected ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110 z-10" :
                            type === 'business' ? "bg-amber-100 hover:bg-amber-200 text-amber-900" : "bg-blue-100 hover:bg-blue-200 text-blue-900"
                )}
            >
                <Armchair className={cn(
                    type === 'business' ? "w-8 h-8" : "w-5 h-5",
                    isSelected ? "fill-white" : "fill-current opacity-50"
                )} />
                {isSelected && (
                    <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2" />
                    </div>
                )}
                <span className="absolute bottom-1 text-[8px] font-bold opacity-60">{seatId}</span>
            </button>
        )
    }

    const handleContinue = () => {
        if (selectedSeats.length > 0) {
            router.push(`/book/checkout?tripId=${tripId}&class=${travelClass}&seats=${selectedSeats.join(',')}&type=${tripType}`)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            <SiteHeader />

            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-sm">
                <div className="container px-4 py-4 flex items-center gap-4">
                    <Link href="/search" className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Choisissez votre place</h1>
                        <p className="text-xs text-slate-500">Logimar Express I • {travelClass === 'business' ? 'Business Class' : 'Économique'}</p>
                    </div>
                </div>
            </div>

            <div className="container px-4 py-8 max-w-md mx-auto">
                {/* Visual Legend */}
                <div className="flex justify-center gap-4 mb-8 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-emerald-500"></div> Sélection
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-slate-200"></div> Occupé
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={cn("w-4 h-4 rounded", travelClass === 'business' ? "bg-amber-100" : "bg-blue-100")}></div> Libre
                    </div>
                </div>

                {/* Boat Hull/Container */}
                <div className="bg-white rounded-[3rem] rounded-b-[1rem] border-4 border-slate-200 p-6 shadow-xl relative overflow-hidden min-h-[500px]">
                    {/* Cockpit / Front */}
                    <div className="absolute top-0 left-0 right-0 h-16 bg-slate-100 border-b border-slate-200 flex items-center justify-center">
                        <div className="w-16 h-1 bg-slate-300 rounded-full"></div>
                    </div>

                    <div className="mt-12 space-y-8 pb-12">
                        {/* Business Section */}
                        {travelClass === 'business' ? (
                            <div className="relative p-4 rounded-xl border-2 border-dashed bg-amber-50/50 border-amber-200">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold text-amber-600 uppercase tracking-widest">Business</div>
                                {Array.from({ length: 2 }).map((_, r) => (
                                    <div key={r} className="flex justify-center gap-8 mb-4">
                                        <div className="flex gap-2">{['A', 'B'].map(c => renderSeat(r + 1, c, 'business'))}</div>
                                        <div className="flex gap-2">{['C', 'D'].map(c => renderSeat(r + 1, c, 'business'))}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="relative p-4 rounded-xl border-2 border-dashed bg-slate-50 border-slate-100 opacity-50 grayscale pointer-events-none filter blur-[1px]">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Business</div>
                                {Array.from({ length: 2 }).map((_, r) => (
                                    <div key={r} className="flex justify-center gap-8 mb-4">
                                        <div className="flex gap-2">{['A', 'B'].map(c => renderSeat(r + 1, c, 'business'))}</div>
                                        <div className="flex gap-2">{['C', 'D'].map(c => renderSeat(r + 1, c, 'business'))}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Economy Section */}
                        {travelClass === 'eco' ? (
                            <div className="relative p-4 rounded-xl border-2 border-dashed bg-blue-50/50 border-blue-200">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold text-blue-600 uppercase tracking-widest">Économique</div>
                                {Array.from({ length: 8 }).map((_, r) => (
                                    <div key={r} className="flex justify-center gap-4 mb-2">
                                        <div className="flex gap-1">{['A', 'B', 'C'].map(c => renderSeat(r + 3, c, 'eco'))}</div>
                                        <div className="flex gap-1">{['D', 'E', 'F'].map(c => renderSeat(r + 3, c, 'eco'))}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="relative p-4 rounded-xl border-2 border-dashed bg-slate-50 border-slate-100 opacity-50 grayscale pointer-events-none filter blur-[1px]">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Économique</div>
                                {Array.from({ length: 3 }).map((_, r) => (
                                    <div key={r} className="flex justify-center gap-4 mb-2">
                                        <div className="flex gap-1">{['A', 'B', 'C'].map(c => renderSeat(r + 3, c, 'eco'))}</div>
                                        <div className="flex gap-1">{['D', 'E', 'F'].map(c => renderSeat(r + 3, c, 'eco'))}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:hidden pb-safe">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs text-slate-500">Siège sélectionné</p>
                        <p className="text-xl font-bold text-slate-900">{selectedSeats.length > 0 ? selectedSeats.join(', ') : '-'}</p>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleContinue}
                        disabled={selectedSeats.length === 0}
                        className="flex-1 rounded-xl bg-slate-900 text-white"
                    >
                        Confirmer
                    </Button>
                </div>
            </div>
            {/* Desktop Floating Button */}
            <div className="fixed bottom-8 right-8 hidden md:block z-50">
                <Button
                    size="lg"
                    onClick={handleContinue}
                    disabled={selectedSeats.length === 0}
                    className="rounded-full px-8 shadow-2xl bg-slate-900 text-white"
                >
                    Confirmer la sélection ({selectedSeats.length}) <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

export default function SeatSelectionPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Chargement...</div>}>
            <SeatSelectionContent />
        </Suspense>
    )
}
