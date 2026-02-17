"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PriceCalendarProps {
    value: Date | undefined
    onChange: (date: Date) => void
    label: string
}

export function PriceCalendar({ value, onChange, label }: PriceCalendarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const daysInMonth = 31 // March
    const startDay = 6 // Sunday is 0, March 1st 2026 is a Sunday? Let's check. 
    // March 1st 2026 is actually a Sunday.

    // Mock Prices
    const getPrice = (day: number) => {
        if (day % 7 === 2) return "35k" // Tuesday deal
        if (day % 7 === 5) return "35k" // Friday deal
        if (day === 15) return "PROMO"
        return "45k"
    }

    const getPriceColor = (day: number) => {
        const p = getPrice(day)
        if (p === "PROMO") return "text-emerald-600 font-bold"
        if (p === "35k") return "text-emerald-500 font-medium"
        return "text-slate-400"
    }

    return (
        <div className="relative group" ref={containerRef}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">{label}</label>

            {/* Trigger Input */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-full h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center pl-12 pr-4 cursor-pointer hover:bg-slate-100 transition-colors focus-within:ring-2 focus-within:ring-blue-500"
            >
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-blue-500 transition-colors" />
                <span className={cn("text-slate-900 font-medium", !value && "text-slate-400")}>
                    {value ? value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : "Choisir une date"}
                </span>
            </div>

            {/* Calendar Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-bold text-slate-900">Mars 2026</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                            <span key={i} className="text-xs font-medium text-slate-400">{d}</span>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty start days (March 1st 2026 is Sunday, index 0, so no empty slots needed if starts on Sunday) */}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1
                            const isSelected = value?.getDate() === day && value?.getMonth() === 2 // Mock logic

                            return (
                                <button
                                    key={day}
                                    onClick={() => {
                                        const d = new Date(2026, 2, day)
                                        onChange(d)
                                        setIsOpen(false)
                                    }}
                                    className={cn(
                                        "h-14 rounded-xl flex flex-col items-center justify-center transition-all border border-transparent",
                                        isSelected
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                                            : "hover:bg-slate-50 hover:border-slate-100 text-slate-900"
                                    )}
                                >
                                    <span className={cn("text-sm font-bold", isSelected ? "text-white" : "text-slate-700")}>{day}</span>
                                    <span className={cn("text-[10px]", isSelected ? "text-blue-200" : getPriceColor(day))}>
                                        {getPrice(day)}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                        <span>*Prix TTC par personne</span>
                        <button onClick={() => setIsOpen(false)} className="text-slate-900 font-medium hover:underline">Fermer</button>
                    </div>
                </div>
            )}
        </div>
    )
}
