"use client"

import { SiteHeader } from "@/components/site-header"
import { TripCard } from "@/components/trip-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, SlidersHorizontal, CalendarDays, Briefcase, Armchair } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const mockTrips = [
    {
        id: '1',
        boatName: 'Logimar Express I',
        departureTime: '07:30',
        arrivalTime: '10:30',
        origin: 'LBV',
        destination: 'POG',
        basePrice: 35000,
        currentPrice: 35000,
        seatsAvailable: 142
    },
    {
        id: '2',
        boatName: 'Logimar Queen',
        departureTime: '13:00',
        arrivalTime: '16:30',
        origin: 'LBV',
        destination: 'POG',
        basePrice: 35000,
        currentPrice: 28000, // Yield Promo
        seatsAvailable: 85
    },
    {
        id: '3',
        boatName: 'Logimar Express II',
        departureTime: '16:00',
        arrivalTime: '19:00',
        origin: 'LBV',
        destination: 'POG',
        basePrice: 45000, // VIP Time
        currentPrice: 42000,
        seatsAvailable: 12 // Scarcity
    }
]

function BookingContent() {
    const searchParams = useSearchParams()

    // For this specific request, I will assume the search page *would* pass these.
    // Let's grab them safely.
    const tripType = searchParams.get('type') === 'round-trip' ? 'round-trip' : 'one-way';
    const travelClass = searchParams.get('class') === 'business' ? 'business' : 'eco';

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <SiteHeader />

            {/* Header Bar */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-10 shadow-sm">
                <div className="container px-4 py-4 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-bold text-slate-900 leading-tight">Libreville <span className="text-slate-400 px-2">→</span> Port-Gentil</h1>
                            {tripType === 'round-trip' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase whitespace-nowrap">↘ -5% Offre A/R</span>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Mar 10 Mars</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1">
                                {travelClass === 'business' ? <Briefcase className="h-3 w-3 text-amber-600" /> : <Armchair className="h-3 w-3" />}
                                {travelClass === 'business' ? <span className="text-amber-600 font-medium">Business Class</span> : 'Économique'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container px-4 py-8 max-w-4xl mx-auto space-y-6">
                {/* Filters (Visual Only) */}
                <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-slate-500">{mockTrips.length} traversées trouvées</p>
                    <Button variant="outline" size="sm" className="gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filtres
                    </Button>
                </div>

                {/* Results List */}
                <div className="space-y-4">
                    {mockTrips.map(trip => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            travelClass={travelClass}
                            tripType={tripType}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function BookingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Chargement...</div>}>
            <BookingContent />
        </Suspense>
    )
}
