"use client"

import { useState, useRef, useEffect } from "react"
import { ScanLine, CheckCircle2, XCircle, Ship, RefreshCcw, Flashlight, MoreVertical } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function ScanPage() {
    const [scanning, setScanning] = useState(false)
    const [result, setResult] = useState<'success' | 'error' | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Simulate camera access (mock)
    useEffect(() => {
        // In a real app, we would request camera access here.
        // navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    }, [])

    const handleScan = () => {
        if (scanning || result) return
        setScanning(true)

        // Simulate scan delay
        setTimeout(() => {
            setScanning(false)
            // Randomly succeed or fail for demo purposes (80% success)
            const isSuccess = Math.random() > 0.2
            setResult(isSuccess ? 'success' : 'error')
        }, 1500)
    }

    const resetScan = () => {
        setResult(null)
        setScanning(false)
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pb-8">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <Ship className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-sm tracking-tight">Logimar<span className="text-blue-400">.scan</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full bg-black/40 backdrop-blur-md">
                        <Flashlight className="h-5 w-5 text-white" />
                    </button>
                    <button className="p-2 rounded-full bg-black/40 backdrop-blur-md">
                        <MoreVertical className="h-5 w-5 text-white" />
                    </button>
                </div>
            </div>

            {/* Camera Viewport (Mock) */}
            <div
                className="flex-1 relative flex items-center justify-center cursor-pointer"
                onClick={handleScan}
            >
                {/* Simulated Camera Feed Background */}
                <div className="absolute inset-0 bg-slate-900 z-0">
                    <div className="w-full h-full opacity-20 bg-[url('https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=2622&auto=format&fit=crop')] bg-cover bg-center mix-blend-luminosity"></div>
                </div>

                {!result && (
                    <div className="relative z-10 w-64 h-64 border-2 border-white/50 rounded-3xl overflow-hidden">
                        {/* Corner Markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>

                        {/* Scanning Animation */}
                        {scanning && (
                            <motion.div
                                initial={{ top: 0, opacity: 0 }}
                                animate={{ top: "100%", opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                className="absolute left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]"
                            />
                        )}

                        {!scanning && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-xs text-white/70 font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                    Touchez pour scanner
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Result Overlay */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-30 p-6 text-slate-900 shadow-2xl"
                    >
                        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>

                        {result === 'success' ? (
                            <div className="text-center">
                                <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-emerald-600 mb-1">Billet Valide</h2>
                                <p className="text-slate-400 text-sm mb-6">Scanné à 07:12:45</p>

                                <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left border border-slate-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Passager</p>
                                            <p className="font-bold text-lg">M. Jean NDONG</p>
                                        </div>
                                        <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-xs font-bold">1A</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Classe</p>
                                            <p className="font-bold text-slate-700">Business</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Navire</p>
                                            <p className="font-bold text-slate-700">Express I</p>
                                        </div>
                                    </div>
                                    {/* Upsell Badges */}
                                    <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2 flex-wrap">
                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">PRIORITAIRE</span>
                                        <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded">2 BAGAGES</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <XCircle className="h-8 w-8 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-red-600 mb-1">Billet Invalide</h2>
                                <p className="text-slate-400 text-sm mb-6">Ce billet a déjà été utilisé.</p>

                                <div className="bg-red-50 rounded-xl p-4 mb-6 border border-red-100 text-red-800 text-sm font-medium">
                                    ⚠️ Attention : Fraude potentielle détectée.
                                </div>
                            </div>
                        )}

                        <button
                            onClick={resetScan}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                        >
                            <RefreshCcw className="h-5 w-5" /> Scanner le suivant
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
