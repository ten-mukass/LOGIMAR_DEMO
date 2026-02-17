"use client"

import { SiteHeader } from "@/components/site-header"
import { BookingSearch } from "@/components/booking-search"

export default function SearchPage() {
    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <SiteHeader />
            <div className="container px-4 py-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">Réserver un billet</h1>
                <BookingSearch />
            </div>
        </div>
    )
}
