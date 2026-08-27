import { z } from 'zod'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'

const PRICING = {
  inputPerMillionUsd: 0.22,
  outputPerMillionUsd: 0.66,
  cacheReadPerMillionUsd: 0.007,
  cacheWritePerMillionUsd: 0,
} as const

type Buckets = {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

type CostPeakState = {
  totalUsd: number
  last: { turn: number; step: number; buckets: Buckets } | null
}

export type CostPeakProjection = number

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    costPeak: CostPeakProjection
  }

  interface SessionProjectionStateMap {
    costPeak: CostPeakState
  }
}

const bucketsSchema = z.object({
  uncachedInputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
}).strict()

const stateSchema = z.object({
  totalUsd: z.number().nonnegative(),
  last: z.object({
    turn: z.number().int().nonnegative(),
    step: z.number().int().nonnegative(),
    buckets: bucketsSchema,
  }).nullable(),
}).strict()

const peakWindowsUtc = [{ start: 60, end: 240 }, { start: 360, end: 600 }] as const

function isPeakAt(time: number): boolean {
  const now = new Date(time)
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes()
  return peakWindowsUtc.some(window => minute >= window.start && minute < window.end)
}

function bucketsFrom(usage: TokenUsage): Buckets {
  return {
    uncachedInputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.cacheWriteTokens ?? 0,
  }
}

function usageOf(event: SessionEvent): { turn: number; step: number; usage: TokenUsage } | undefined {
  if (event.type === 'assistant/chunk' && event.data.chunk.type === 'usage') {
    return { turn: event.data.turn, step: event.data.step, usage: event.data.chunk.usage }
  }
  if (event.type === 'assistant/message' && event.data.usage !== undefined) {
    return { turn: event.data.turn, step: event.data.step, usage: event.data.usage }
  }
  return undefined
}

function sameBuckets(left: Buckets, right: Buckets): boolean {
  return left.uncachedInputTokens === right.uncachedInputTokens
    && left.outputTokens === right.outputTokens
    && left.cacheReadTokens === right.cacheReadTokens
    && left.cacheWriteTokens === right.cacheWriteTokens
}

/** Price only new usage at the tariff active when that usage event arrived. */
export function priceUsageDelta(next: Buckets, previous: Buckets | undefined, peak: boolean): number {
  const multiplier = peak ? 2 : 1
  return multiplier * (
    Math.max(0, next.uncachedInputTokens - (previous?.uncachedInputTokens ?? 0)) * PRICING.inputPerMillionUsd / 1_000_000
      + Math.max(0, next.outputTokens - (previous?.outputTokens ?? 0)) * PRICING.outputPerMillionUsd / 1_000_000
      + Math.max(0, next.cacheReadTokens - (previous?.cacheReadTokens ?? 0)) * PRICING.cacheReadPerMillionUsd / 1_000_000
      + Math.max(0, next.cacheWriteTokens - (previous?.cacheWriteTokens ?? 0)) * PRICING.cacheWritePerMillionUsd / 1_000_000
  )
}

export const costPeakProjectionDefinition = {
  key: 'costPeak',
  stateVersion: 1,
  stateSchema,
  init: (): CostPeakState => ({ totalUsd: 0, last: null }),
  apply: (state: CostPeakState, event: SessionEvent): CostPeakState => {
    const sample = usageOf(event)
    if (sample === undefined) return state
    const buckets = bucketsFrom(sample.usage)
    const previous = state.last?.turn === sample.turn && state.last.step === sample.step
      ? state.last.buckets
      : undefined
    if (previous !== undefined && sameBuckets(previous, buckets)) return state
    return {
      totalUsd: state.totalUsd + priceUsageDelta(buckets, previous, isPeakAt(event.time)),
      last: { turn: sample.turn, step: sample.step, buckets },
    }
  },
  wire: {
    viewSchema: z.number().nonnegative(),
    view: (state: CostPeakState): CostPeakProjection => state.totalUsd,
  },
} satisfies ProjectionDefinition<'costPeak', CostPeakState>
