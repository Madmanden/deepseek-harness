import { CostPeakHeader } from './CostPeakHeader.tsx'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-token-meter/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'dsh-cost-peak',
    order: 20,
  }, CostPeakHeader))
}
