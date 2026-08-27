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

function totalUsd(usage: SessionProjectionMap['tokenUsage'] | undefined): number {
  if (usage === undefined) return 0
  return usage.uncachedInputTokens * PRICING.inputPerMillionUsd / 1_000_000
    + usage.outputTokens * PRICING.outputPerMillionUsd / 1_000_000
    + usage.cacheReadTokens * PRICING.cacheReadPerMillionUsd / 1_000_000
    + usage.cacheWriteTokens * PRICING.cacheWritePerMillionUsd / 1_000_000
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(value)
}

function formatTokens(value: number): string {
  if (value < 1_000) return String(value)
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}K`
  return `${(value / 1_000_000).toFixed(2)}M`
}

const shell: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
  color: 'var(--dsw-text-muted, #667085)', whiteSpace: 'nowrap',
}

const dot = (peak: boolean): CSSProperties => ({
  width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
  background: peak ? '#d97706' : '#16a34a',
})

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
    <span style={shell} title="Estimated session cost; PEAK follows DeepSeek Beijing time and is shown for Copenhagen users">
      <span style={dot(peak)} aria-hidden="true" />
      <span>{peak ? 'PEAK' : 'OFF-PEAK'}</span>
      <span aria-label={`Estimated cost ${formatUsd(totalUsd(usage))}`}>
        {formatUsd(totalUsd(usage))} · {formatTokens(totalTokens)} tokens
      </span>
    </span>
  )
}
