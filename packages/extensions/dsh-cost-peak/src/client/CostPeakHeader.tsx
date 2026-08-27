import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionProjectionMap } from '@deepseek-ai/dsh-client-runtime/client'

type Props = PropsRuntime<'conversation.session.header.utilities'>

/**
 * Edit these values for the model/provider you actually use.
 * Values are USD per 1M tokens. Keeping them in source makes the estimate
 * explicit until a settings screen is added.
 */
const PRICING = {
  // Official DeepSeek-V4-Flash prices, USD per 1M tokens (Aug 2026).
  inputPerMillionUsd: 0.14,
  outputPerMillionUsd: 0.28,
  cacheReadPerMillionUsd: 0.0028,
  // DeepSeek's public table lists cache-hit and cache-miss input, not a
  // separately billed cache-write bucket. DSH normally reports this as 0.
  cacheWritePerMillionUsd: 0,
} as const

/** DeepSeek publishes peak windows in Beijing time (UTC+8). */
const PEAK_WINDOWS = [
  { start: 9 * 60, end: 12 * 60 },
  { start: 14 * 60, end: 18 * 60 },
] as const

function isPeakNow(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find(part => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find(part => part.type === 'minute')?.value ?? 0)
  const current = hour * 60 + minute
  return PEAK_WINDOWS.some(window => current >= window.start && current < window.end)
}

function totalUsd(usage: SessionProjectionMap['tokenUsage'] | undefined, peak: boolean): number {
  if (usage === undefined) return 0
  const multiplier = peak ? 2 : 1
  return multiplier * (
    usage.uncachedInputTokens * PRICING.inputPerMillionUsd / 1_000_000
      + usage.outputTokens * PRICING.outputPerMillionUsd / 1_000_000
      + usage.cacheReadTokens * PRICING.cacheReadPerMillionUsd / 1_000_000
      + usage.cacheWriteTokens * PRICING.cacheWritePerMillionUsd / 1_000_000
  )
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(value)
}

function formatTokens(value: number): string {
  if (value < 1_000) return String(value)
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}K`
  return `${(value / 1_000_000).toFixed(2)}M`
}

const shell = (peak: boolean): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  minHeight: 34, padding: '5px 10px', borderRadius: 9,
  border: `1px solid ${peak ? 'rgba(245, 158, 11, 0.38)' : 'rgba(52, 211, 153, 0.26)'}`,
  background: peak ? 'rgba(245, 158, 11, 0.12)' : 'rgba(52, 211, 153, 0.08)',
  color: 'var(--dsw-text, #f2f4f7)', whiteSpace: 'nowrap',
})

const dot = (peak: boolean): CSSProperties => ({
  width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flex: '0 0 auto',
  background: peak ? '#d97706' : '#16a34a',
  boxShadow: `0 0 0 3px ${peak ? 'rgba(245, 158, 11, 0.16)' : 'rgba(52, 211, 153, 0.14)'}`,
})

const mode: CSSProperties = {
  fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
}

const price: CSSProperties = {
  fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
}

const tokens: CSSProperties = {
  fontSize: 11, color: 'var(--dsw-text-muted, #98a2b3)',
  fontVariantNumeric: 'tabular-nums',
}

export function CostPeakHeader({ useProjection }: Props): ReactNode {
  const usage = useProjection('tokenUsage')
  const [peak, setPeak] = useState(() => isPeakNow())
  useEffect(() => {
    const timer = window.setInterval(() => { setPeak(isPeakNow()) }, 30_000)
    return () => { window.clearInterval(timer) }
  }, [])
  const totalTokens = usage === undefined ? 0
    : usage.uncachedInputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens

  return (
    <span style={shell(peak)} title="Estimated session cost; PEAK follows DeepSeek Beijing time and is shown for Copenhagen users">
      <span style={dot(peak)} aria-hidden="true" />
      <span style={mode}>{peak ? 'PEAK' : 'OFF-PEAK'}</span>
      <span aria-label={`Estimated cost ${formatUsd(totalUsd(usage, peak))}`} style={price}>
        {formatUsd(totalUsd(usage, peak))}
      </span>
      <span style={tokens}>{formatTokens(totalTokens)} tokens</span>
    </span>
  )
}
