"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowRight } from "lucide-react"
import { PriceCalendar } from "@/components/price-calendar"

export function BookingSearch() {
    // Mock state for demo
    const [origin, setOrigin] = useState("LBV")
    const [destination, setDestination] = useState("POG")
    const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way")
    const [travelClass, setTravelClass] = useState<"eco" | "business">("eco")

    // Dates as Date objects for the calendar
    const [date, setDate] = useState<Date>(new Date(2026, 2, 10)) // March 10
    const [returnDate, setReturnDate] = useState<Date>(new Date(2026, 2, 15)) // March 15

    // Passengers
    const [passengers, setPassengers] = useState({ adults: 1, babies: 0 })
    const [showPassengerSelect, setShowPassengerSelect] = useState(false)

    return (
        <div className="bg-white rounded-3xl shadow-lg shadow-blue-900/10 border border-slate-100 p-6 md:p-8 max-w-4xl mx-auto backdrop-blur-xl bg-white/90">

            {/* Top Toggles */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 relative z-30">
                {/* Trip Type Toggle */}
                {/* Trip Type Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto shadow-inner">
                    <button
                        type="button"
                        onClick={() => setTripType("one-way")}
                        className={`flex-1 sm:flex-initial whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tripType === 'one-way' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Aller Simple
                    </button>
                    <button
                        type="button"
                        onClick={() => setTripType("round-trip")}
                        className={`flex-1 sm:flex-initial whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tripType === 'round-trip' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Aller-Retour
                    </button>
                </div>

                {/* Class Toggle */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Classe</span>
                    <select
                        value={travelClass}
                        onChange={(e) => setTravelClass(e.target.value as "eco" | "business")}
                        className="bg-transparent font-bold text-slate-900 outline-none text-sm cursor-pointer border-none focus:ring-0"
                    >
                        <option value="eco">Économique</option>
                        <option value="business">Affaires (VIP)</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end relative z-20">

                {/* Origin */}
                <div className="flex-1 w-full space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Départ</label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 h-5 w-5 group-focus-within:text-blue-600 transition-colors z-10" />
                        <select
                            value={origin}
                            onChange={(e) => {
                                setOrigin(e.target.value);
                                setDestination(e.target.value === 'LBV' ? 'POG' : 'LBV');
                            }}
                            className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all hover:bg-slate-100 cursor-pointer"
                        >
                            <option value="LBV">Libreville (Port Môle)</option>
                            <option value="POG">Port-Gentil</option>
                        </select>
                    </div>
                </div>

                {/* Destination */}
                <div className="flex-1 w-full space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Arrivée</label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 h-5 w-5 group-focus-within:text-emerald-600 transition-colors z-10" />
                        <select
                            value={destination}
                            className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none transition-all hover:bg-slate-100 cursor-pointer"
                        >
                            <option value="LBV">Libreville</option>
                            <option value="POG">Port-Gentil</option>
                        </select>
                    </div>
                </div>

                {/* Date */}
                <div className="flex-1 w-full space-y-2">
                    <PriceCalendar
                        label={tripType === 'round-trip' ? 'Départ' : 'Date'}
                        value={date}
                        onChange={setDate}
                    />
                </div>

                {/* Return Date (Conditional) */}
                {tripType === 'round-trip' && (
                    <div className="flex-1 w-full space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                        <PriceCalendar
                            label="Retour"
                            value={returnDate}
                            onChange={setReturnDate}
                        />
                    </div>
                )}

                {/* Passengers */}
                <div className="flex-1 w-full space-y-2 relative">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Passagers</label>
                    <button
                        onClick={() => setShowPassengerSelect(!showPassengerSelect)}
                        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4 text-left font-medium text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        {passengers.adults} Adulte{passengers.adults > 1 ? 's' : ''}, {passengers.babies} Bébé{passengers.babies > 1 ? 's' : ''}
                    </button>

                    {showPassengerSelect && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="font-bold text-slate-900">Adultes</p>
                                    <p className="text-xs text-slate-500">12+ ans</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setPassengers(p => ({ ...p, adults: Math.max(1, p.adults - 1) }))}
                                        className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                                    >-</button>
                                    <span className="font-medium w-4 text-center">{passengers.adults}</span>
                                    <button
                                        onClick={() => setPassengers(p => ({ ...p, adults: Math.min(9, p.adults + 1) }))}
                                        className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                                    >+</button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="font-bold text-slate-900">Bébés</p>
                                    <p className="text-xs text-slate-500">0-2 ans</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setPassengers(p => ({ ...p, babies: Math.max(0, p.babies - 1) }))}
                                        className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                                    >-</button>
                                    <span className="font-medium w-4 text-center">{passengers.babies}</span>
                                    <button
                                        onClick={() => setPassengers(p => ({ ...p, babies: Math.min(4, p.babies + 1) }))}
                                        className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                                    >+</button>
                                </div>
                            </div>
                            <Button className="w-full" size="sm" onClick={() => setShowPassengerSelect(false)}>Valider</Button>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="w-full md:w-auto mt-2 md:mt-0">
                    <Button
                        size="lg"
                        variant="premium"
                        className="w-full h-14 rounded-xl text-lg px-8 shadow-blue-500/25"
                        onClick={() => {
                            window.location.href = `/book?type=${tripType}&class=${travelClass}&adults=${passengers.adults}&babies=${passengers.babies}`
                        }}
                    >
                        Rechercher
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Quick filters / Trust signals */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500 justify-center md:justify-start">
                <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Simulateur Yield Actif
                </span>
                <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Port Môle ↔ Port-Gentil</span>
                <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                    {tripType === 'round-trip' ? 'Remise A/R incluse' : 'Meilleur prix garanti'}
                </span>
            </div>
        </div>
    )
}
