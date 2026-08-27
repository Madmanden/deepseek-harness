import type { Context } from '@deepseek-ai/cordis'
import { costPeakProjectionDefinition } from './pricing-projection.ts'

/** The host projection is required to preserve historical tariff rates. */
export const inject = ['sessionProjections']

export function apply(ctx: Context): void {
  ctx.sessionProjections.register(costPeakProjectionDefinition)
}
