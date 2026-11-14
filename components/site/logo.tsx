import Image from "next/image"
import { cn } from "@/lib/utils"

export function Logo({ className, taille = 44 }: { className?: string; taille?: number }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[10px] bg-white p-1", className)}
      style={{ width: taille, height: taille }}
    >
      <Image
        src="/images/logo-logimar-241-carre.png"
        alt=""
        width={taille - 8}
        height={taille - 8}
        priority
      />
    </span>
  )
}
