import { describe, expect, it } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("fusionne les classes et garde la dernière classe Tailwind en conflit", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
  })

  it("ignore les valeurs fausses", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b")
  })
})
