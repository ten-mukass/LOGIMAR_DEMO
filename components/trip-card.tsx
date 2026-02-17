import { Button } from "@/components/ui/button"
import { Ship, Clock, ArrowRight, TrendingDown, Users } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface TripCardProps {
    trip: {
        id: string
        boatName: string
        departureTime: string
        arrivalTime: string
        origin: string
        destination: string
        basePrice: number
        currentPrice: number
        seatsAvailable: number
    }
    travelClass?: 'eco' | 'business'
    tripType?: 'one-way' | 'round-trip'
}

export function TripCard({ trip, travelClass = 'eco', tripType = 'one-way' }: TripCardProps) {
    // Dynamic Pricing Logic for Demo
    const multiplier = travelClass === 'business' ? 1.8 : 1;
    const base = trip.basePrice * multiplier;
    const current = trip.currentPrice * multiplier;

    // Round Trip Discount (10% off return leg) -> effectively 1.9x for RT
    const finalPrice = tripType === 'round-trip' ? (current * 1.9) : current;
    const finalBase = tripType === 'round-trip' ? (base * 2) : base;

    const discount = Math.round(((finalBase - finalPrice) / finalBase) * 100);
    const isHighDemand = trip.seatsAvailable < 50;

    return (
        <div className={cn(
            "group relative bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden",
            travelClass === 'business' ? "border-amber-200 hover:border-amber-400" : "border-slate-100 hover:border-blue-200"
        )}>
            {/* Yield Indicator / Promo Badge */}
            {discount > 0 && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-lg shadow-emerald-500/20 z-10">
                    <TrendingDown className="h-3 w-3 inline mr-1" />
                    -{discount}% {tripType === 'round-trip' ? 'Offre A/R' : 'Offre Spéciale'}
                </div>
            )}

            {/* Class Badge */}
            {travelClass === 'business' && (
                <div className="absolute top-0 left-0 bg-slate-900 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-br-xl uppercase tracking-widest z-10 border-b border-r border-amber-500/30">
                    Business Class
                </div>
            )}

            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                {/* Time & Route */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Ship className="h-4 w-4" />
                        <span>{trip.boatName}</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <span className="text-2xl font-bold text-slate-900">{trip.departureTime}</span>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{trip.origin}</p>
                        </div>

                        <div className="flex-1 flex flex-col items-center px-4">
                            <div className="w-full h-px bg-slate-200 relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-slate-300"></div>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-slate-300"></div>
                                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 bg-slate-50 px-2 text-xs text-slate-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> 3h00
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <span className="text-2xl font-bold text-slate-900">{trip.arrivalTime}</span>
                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{trip.destination}</p>
                        </div>
                    </div>
                </div>

                {/* Separator Mobile */}
                <div className="md:hidden w-full h-px bg-slate-100"></div>

                {/* Price & Action */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 min-w-[140px]">
                    <div className="text-right">
                        {discount > 0 && (
                            <span className="block text-sm text-slate-400 line-through decoration-slate-300 mb-0.5">
                                {finalBase.toLocaleString('fr-FR')} FCFA
                            </span>
                        )}
                        <div className="flex items-baseline gap-1 md:justify-end">
                            <span className={cn("text-2xl font-bold tracking-tight", discount > 0 ? "text-emerald-600" : "text-blue-900")}>
                                {finalPrice.toLocaleString('fr-FR')}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">FCFA</span>
                        </div>

                        <p className="text-[10px] text-slate-400 mt-0.5">
                            {tripType === 'round-trip' ? 'Total Aller-Retour' : 'Par personne'}
                        </p>

                        {isHighDemand && (
                            <p className="text-xs text-amber-600 font-medium flex items-center justify-end mt-1 animate-pulse">
                                <Users className="h-3 w-3 mr-1" />
                                Plus que {trip.seatsAvailable} places
                            </p>
                        )}
                    </div>

                    <Button className="w-full md:w-auto rounded-xl" size="lg" variant={discount > 0 ? "premium" : "default"} asChild>
                        <Link href={`/book/seats?tripId=${trip.id}&class=${travelClass}&type=${tripType}`}>
                            Sélectionner
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
