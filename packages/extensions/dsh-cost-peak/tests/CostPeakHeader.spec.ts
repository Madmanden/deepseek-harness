import { describe, expect, it } from 'vitest'
import { formatCountdown, isPeakNow, nextTariffTransition } from '../src/client/CostPeakHeader.tsx'

const utc = (value: string) => new Date(`${value}Z`)

describe('DeepSeek UTC tariff schedule', () => {
  it('finds the end of the current peak window', () => {
    const now = utc('2026-08-27T02:30:00')
    const transition = nextTariffTransition(now)

    expect(isPeakNow(now)).toBe(true)
    expect(transition.at.toISOString()).toBe('2026-08-27T04:00:00.000Z')
    expect(transition.mode).toBe('OFF-PEAK')
    expect(formatCountdown(now, transition)).toBe('1t 30m til OFF-PEAK')
  })

  it('finds the next peak between weekday windows', () => {
    const now = utc('2026-08-27T04:30:00')
    const transition = nextTariffTransition(now)

    expect(isPeakNow(now)).toBe(false)
    expect(transition.at.toISOString()).toBe('2026-08-27T06:00:00.000Z')
    expect(formatCountdown(now, transition)).toBe('1t 30m til PEAK')
  })

  it('omits zero hours for short countdowns', () => {
    const now = utc('2026-08-27T05:18:00')
    const transition = nextTariffTransition(now)

    expect(formatCountdown(now, transition)).toBe('42m til PEAK')
  })

  it('skips the weekend after Friday evening', () => {
    const now = utc('2026-08-28T10:30:00')
    const transition = nextTariffTransition(now)

    expect(isPeakNow(now)).toBe(false)
    expect(transition.at.toISOString()).toBe('2026-08-31T01:00:00.000Z')
    expect(formatCountdown(now, transition)).toBe('62t 30m til PEAK')
  })

  it('uses UTC rather than the local daylight-saving offset', () => {
    const summer = utc('2026-07-06T01:30:00')
    const winter = utc('2026-01-05T01:30:00')

    expect(nextTariffTransition(summer).at.toISOString()).toBe('2026-07-06T04:00:00.000Z')
    expect(nextTariffTransition(winter).at.toISOString()).toBe('2026-01-05T04:00:00.000Z')
  })
})
