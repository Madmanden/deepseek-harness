import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionProjectionMap } from '@deepseek-ai/dsh-client-runtime/client'

type Props = PropsRuntime<'conversation.composer.dock'>

/**
 * Edit these values for the model/provider you actually use.
 * Values are USD per 1M tokens. Keeping them in source makes the estimate
 * explicit until a settings screen is added.
 */
const PRICING = {
  // Official DeepSeek-V4-Flash off-peak prices, USD per 1M tokens.
  // DeepSeek's peak rates are exactly 2x these values.
  inputPerMillionUsd: 0.22,
  outputPerMillionUsd: 0.66,
  cacheReadPerMillionUsd: 0.007,
  // DeepSeek's public table lists cache-hit and cache-miss input, not a
  // separately billed cache-write bucket. DSH normally reports this as 0.
  cacheWritePerMillionUsd: 0,
} as const

/** DeepSeek publishes peak windows in UTC, Monday through Friday. */
const PEAK_WINDOWS_UTC = [
  { start: 1 * 60, end: 4 * 60 },
  { start: 6 * 60, end: 10 * 60 },
] as const

type TariffTransition = Readonly<{
  at: Date
  mode: 'PEAK' | 'OFF-PEAK'
}>

/** Return whether a UTC instant falls inside one of the weekday peak windows. */
export function isPeakNow(now = new Date()): boolean {
  const weekday = now.getUTCDay()
  if (weekday === 0 || weekday === 6) return false
  const current = now.getUTCHours() * 60 + now.getUTCMinutes()
  return PEAK_WINDOWS_UTC.some(window => current >= window.start && current < window.end)
}

/**
 * Find the next DeepSeek tariff transition from a UTC instant.
 * @param now - Instant used as the schedule reference.
 * @returns The first future transition, including the mode it starts.
 */
export function nextTariffTransition(now = new Date()): TariffTransition {
  const candidates: TariffTransition[] = []
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const dayMs = 24 * 60 * 60 * 1_000
  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const dateStart = dayStart + dayOffset * dayMs
    const weekday = new Date(dateStart).getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    for (const window of PEAK_WINDOWS_UTC) {
      candidates.push({ at: new Date(dateStart + window.start * 60 * 1_000), mode: 'PEAK' })
      candidates.push({ at: new Date(dateStart + window.end * 60 * 1_000), mode: 'OFF-PEAK' })
    }
  }
  const next = candidates
    .filter(candidate => candidate.at.getTime() > now.getTime())
    .sort((left, right) => left.at.getTime() - right.at.getTime())[0]
  if (next === undefined) throw new Error('No future tariff transition found')
  return next
}

/** Derive the emphasized duration and un-emphasized tariff label separately. */
function countdownParts(now: Date, transition: TariffTransition): { duration: string; mode: TariffTransition['mode'] } {
  const totalMinutes = Math.max(0, Math.floor(
    (transition.at.getTime() - now.getTime()) / (60 * 1_000),
  ))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  const duration = hours === 0 ? `${totalMinutes}m` : `${hours}t ${minutes}m`
  return { duration, mode: transition.mode }
}

/** Format a tariff transition distance with whole hours and zero-padded minutes. */
export function formatCountdown(now: Date, transition: TariffTransition): string {
  const parts = countdownParts(now, transition)
  return `${parts.duration} til ${parts.mode}`
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value)
}

function formatTokens(value: number): string {
  if (value < 1_000) return String(value)
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}K`
  return `${(value / 1_000_000).toFixed(2)}M`
}

const shell: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 0,
  minWidth: 0, paddingTop: 4, boxSizing: 'border-box',
  color: 'var(--dsw-alias-label-tertiary)',
  fontSize: 12, lineHeight: '20px', whiteSpace: 'nowrap',
}

const separator: CSSProperties = {
  color: 'var(--dsw-alias-separator-primary)', margin: '0 10px',
}

const mode: CSSProperties = {
  fontWeight: 600, letterSpacing: '0.02em',
}

const price: CSSProperties = {
  marginLeft: 4, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
}

const tokens: CSSProperties = {
  color: 'inherit', fontVariantNumeric: 'tabular-nums',
}

export function CostPeakHeader({ useProjection }: Props): ReactNode {
  const usage = useProjection('tokenUsage')
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => { setNow(new Date()) }, 30_000)
    return () => { window.clearInterval(timer) }
  }, [])
  const peak = isPeakNow(now)
  const transition = nextTariffTransition(now)
  const countdown = countdownParts(now, transition)
  const totalTokens = usage === undefined ? 0
    : usage.uncachedInputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens

  return (
    <span style={shell} title="Estimated session cost; PEAK follows DeepSeek UTC schedule and is shown for Copenhagen users">
      <span style={separator} aria-hidden="true">·</span>
      <span style={mode}>{peak ? 'PEAK' : 'OFF-PEAK'}</span>
      {' '}
      <span aria-label={`Estimated cost ${formatUsd(totalUsd(usage, peak))}`} style={price}>
        {formatUsd(totalUsd(usage, peak))}
      </span>
      <span style={separator} aria-hidden="true">·</span>
      <span style={tokens}>
        {countdown.duration} til {countdown.mode}
      </span>
      <span style={separator} aria-hidden="true">·</span>
      <span style={tokens}>
        {formatTokens(totalTokens)} tokens
      </span>
    </span>
  )
}
