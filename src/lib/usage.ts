// -------------------------------------------------------
// Usage tracking module
// In production, replace with database (Supabase, Prisma, etc.)
// -------------------------------------------------------

interface UsageRecord {
  scanCount: number
  paidUntil: number      // epoch ms, 0 = not paid
  firstScanAt: number    // epoch ms
  lastScanAt: number    // epoch ms
}

// In-memory store — resets on deploy. Use DB in production.
const store = new Map<string, UsageRecord>()

const FREE_SCANS = 1
const PAID_PERIOD_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function canUserScan(userId: string): { allowed: boolean; remaining: number; isPaid: boolean } {
  const record = store.get(userId)
  if (!record) {
    return { allowed: true, remaining: FREE_SCANS, isPaid: false }
  }

  if (record.paidUntil > Date.now()) {
    return { allowed: true, remaining: Infinity, isPaid: true }
  }

  const remaining = Math.max(0, FREE_SCANS - record.scanCount)
  return { allowed: remaining > 0, remaining, isPaid: false }
}

export function recordScan(userId: string): void {
  const now = Date.now()
  const record = store.get(userId) || { scanCount: 0, paidUntil: 0, firstScanAt: now, lastScanAt: now }
  record.scanCount++
  record.lastScanAt = now
  store.set(userId, record)
}

export function unlockPaid(userId: string): void {
  const now = Date.now()
  const record = store.get(userId) || { scanCount: 0, paidUntil: 0, firstScanAt: now, lastScanAt: now }
  record.paidUntil = now + PAID_PERIOD_MS
  store.set(userId, record)
}

export function getUsageStats(userId: string): UsageRecord | null {
  return store.get(userId) || null
}

// For debugging / admin
export function _debugStore() {
  return Object.fromEntries(store.entries())
}