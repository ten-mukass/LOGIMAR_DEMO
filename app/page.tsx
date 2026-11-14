"use client"

import { SiteHeader } from "@/components/site-header"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Star, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <SiteHeader />

      <main>
        {/* Hero Section - Showcase */}
        <section className="relative h-[400px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-blue-800">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545167622-3a6ac156f48f?q=80&w=2612&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-transparent to-transparent"></div>
          </div>

          <div className="container relative h-full flex flex-col items-center justify-center text-center px-4">
            <span className="inline-block py-1 px-3 border border-blue-400/30 rounded-full bg-blue-500/10 text-blue-200 text-xs font-bold mb-4 tracking-widest uppercase">
              Logimar Digital
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tighter leading-tight">
              Voyagez Mieux.<br />Voyagez Vite.
            </h1>
            <p className="text-blue-100/80 max-w-md mx-auto mb-8 font-light">
              L’excellence maritime entre Libreville et Port-Gentil.
            </p>
            <Button asChild size="lg" className="w-full max-w-xs rounded-full bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 px-8 py-6 text-lg">
              <Link href="/search" className="flex items-center justify-center gap-2 whitespace-nowrap">
                <span>Réserver un billet</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Partners / Ads Carousel */}
        <section className="py-8 bg-white border-b border-slate-100">
          <div className="container px-4">
            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Nos Partenaires</p>
            <div className="flex gap-8 overflow-x-auto pb-4 items-center justify-start md:justify-center no-scrollbar opacity-60 grayscale hover:grayscale-0 transition-all">
              {/* Fake Logos */}
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800 flex-shrink-0"><span className="h-8 w-8 bg-blue-600 rounded-lg"></span> CANAL+</div>
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800 flex-shrink-0"><span className="h-8 w-8 bg-red-600 rounded-lg"></span> AIRTEL</div>
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800 flex-shrink-0"><span className="h-8 w-8 bg-yellow-500 rounded-lg"></span> MOOV</div>
              <div className="flex items-center gap-2 text-xl font-bold text-slate-800 flex-shrink-0"><span className="h-8 w-8 bg-green-600 rounded-lg"></span> SOBRAGA</div>
            </div>
          </div>
        </section>

        {/* Tourism / Destinations */}
        <section className="py-12 px-4">
          <div className="container mx-auto">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Découvrir le Gabon</h2>
                <p className="text-sm text-slate-500">Les meilleures destinations touristiques.</p>
              </div>
              <Link href="#" className="text-sm font-bold text-blue-600 hover:underline">Voir tout</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Pointe Denis", loc: "Estuaire", img: "https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?q=80&w=2664&auto=format&fit=crop", price: "À la une" },
                { title: "Parc de Loango", loc: "Ogooué-Maritime", img: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2668&auto=format&fit=crop", price: "Nature" },
                { title: "Cap Caravane", loc: "Estuaire", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3f?q=80&w=2670&auto=format&fit=crop", price: "Détente" },
              ].map((item, i) => (
                <div key={i} className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm">
                  <div className="absolute inset-0 bg-slate-200">
                    {/* Placeholder for images since next/image needs config for remote domains, using div with bg */}
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-md rounded-md text-white text-[10px] font-bold mb-2 border border-white/10">
                      {item.price}
                    </span>
                    <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                    <div className="flex items-center text-white/80 text-xs">
                      <MapPin className="h-3 w-3 mr-1" /> {item.loc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ad Banner */}
        <section className="px-4 pb-12">
          <div className="container mx-auto">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-orange-500/20">
              <div>
                <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Offre Partenaire</span>
                <h3 className="text-xl font-bold mt-1">Gagnez 50% de réduction</h3>
                <p className="text-white/90 text-sm mt-1 mb-4">En payant avec Airtel Money.</p>
                <button className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-bold">En profiter</button>
              </div>
              <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Star className="h-8 w-8 text-white fill-white" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
