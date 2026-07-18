// Shared live-data layer — one cached pull of each real production resource from
// the SetMyCareer backend, reused across every admin screen so we never refetch
// the (heavy) roster more than once per session. Read-only / non-destructive:
// nothing here writes. Screens call the hooks and decorate their existing views
// with live figures alongside the demo data (additive, never replacing).

import { useEffect, useState } from "react"
import { getAllPackages, getNavigatorsByPackage, fetchRoster, type PackagesData, type SmcNavigator, type SmcRosterUser } from "@/lib/smc-api"

// module-level promise cache — first caller fetches, everyone shares the result
const cache = new Map<string, Promise<unknown>>()
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, fn().catch((e) => { cache.delete(key); throw e }))
  return cache.get(key) as Promise<T>
}

export interface Live<T> { data?: T; loading: boolean; error?: string }

function useLive<T>(key: string, fn: () => Promise<T>): Live<T> {
  const [s, setS] = useState<Live<T>>(() => ({ loading: true }))
  useEffect(() => {
    let alive = true
    cached(key, fn).then((data) => alive && setS({ data, loading: false })).catch((e) => alive && setS({ loading: false, error: e?.message ?? "failed" }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return s
}

/** Real package catalogue (115, with pricing) — read-only. */
export const useSmcPackages = (): Live<PackagesData[]> => useLive("packages", getAllPackages)

/** Real counsellor ("navigator") roster. */
export const useSmcCounsellors = (): Live<SmcNavigator[]> =>
  useLive("counsellors", () => getNavigatorsByPackage(1, "online", "") as Promise<SmcNavigator[]>)

/** Full registered-user roster (heavy ~1MB; fetched once, cached). */
export const useSmcRoster = (): Live<SmcRosterUser[]> => useLive("roster", fetchRoster)

/** Let a screen reset the cache (e.g. a manual "refresh live data" control). */
export function invalidateLive(key?: string) {
  if (key) cache.delete(key)
  else cache.clear()
}
