"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface Seat {
    id: string
    status: 'available' | 'occupied' | 'selected'
    type: 'standard' | 'business' | 'window'
    price: number
}

// Generate mock seats
const generateSeats = (): Seat[] => {
    const seats: Seat[] = []
    const rows = 10
    const cols = 6

    for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
            const isBusiness = r <= 2
            const isWindow = c === 1 || c === cols
            const isOccupied = Math.random() > 0.7

            seats.push({
                id: `${r}${String.fromCharCode(64 + c)}`,
                status: isOccupied ? 'occupied' : 'available',
                type: isBusiness ? 'business' : isWindow ? 'window' : 'standard',
                price: isBusiness ? 50000 : 35000
            })
        }
    }
    return seats
}

export function SeatMap({ onSeatSelect }: { onSeatSelect: (seat: Seat) => void }) {
    const [seats, setSeats] = useState<Seat[]>(generateSeats())
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null)

    const handleSelect = (seatId: string) => {
        const seat = seats.find(s => s.id === seatId)
        if (!seat || seat.status === 'occupied') return

        setSeats(prev => prev.map(s => {
            if (s.id === seatId) return { ...s, status: s.status === 'selected' ? 'available' : 'selected' }
            if (s.status === 'selected') return { ...s, status: 'available' } // Single select for demo
            return s
        }))

        // Toggle
        if (selectedSeat === seatId) {
            setSelectedSeat(null)
        } else {
            setSelectedSeat(seatId)
            onSeatSelect(seat)
        }
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 max-w-md mx-auto">
            {/* Boat Header (Bow) */}
            <div className="w-full h-24 bg-slate-100 rounded-t-[100px] mb-8 relative border-b-2 border-slate-200">
                <div className="absolute top-8 left-1/2 -translate-x-1/2 text-slate-400 text-xs font-bold uppercase tracking-widest">Avant du navire</div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-6 gap-3 mb-8">
                {/* Aisle Spacer logic handled by col-start if needed, or just gap */}
                {seats.map((seat, i) => {
                    const isAisleRight = (i + 1) % 6 === 3; // Gap after 3rd seat
                    return (
                        <div key={seat.id} className={cn(isAisleRight ? "mr-4" : "")}>
                            <button
                                onClick={() => handleSelect(seat.id)}
                                disabled={seat.status === 'occupied'}
                                className={cn(
                                    "w-10 h-10 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center",
                                    seat.status === 'available' && seat.type === 'business' && "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200",
                                    seat.status === 'available' && seat.type !== 'business' && "bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 border border-slate-200",
                                    seat.status === 'selected' && "bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110 z-10",
                                    seat.status === 'occupied' && "bg-slate-50 text-slate-300 cursor-not-allowed icon-cross"
                                )}
                            >
                                {seat.status === 'occupied' ? '✕' : seat.id}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="flex justify-between text-xs text-slate-500 px-2 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div> Standard</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></div> Business</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-50 text-slate-300 flex items-center justify-center border border-slate-100">✕</div> Occupé</div>
            </div>
        </div>
    )
}
