# dsh-cost-peak

Small local plugin for DeepSeek Harness. It adds a composer-footer utility with:

- cumulative provider-reported token usage from DSH's existing `tokenUsage` projection
- an estimated USD session cost that keeps each usage sample at its historical tariff
- tariff colors and a countdown to the next change based on DeepSeek's UTC schedule

New usage during `PEAK` applies the 2x tariff multiplier; a later tariff change
does not reprice usage that has already been accumulated.

## Install from this checkout

From the DSH repository root:

```sh
pnpm run build
pnpm dsh plugin --profile web add /Users/christian/Documents/dev/deepseek-harness/packages/extensions/dsh-cost-peak
pnpm dsh web
```

The local profile is stored under `$DSH_HOME/profiles/web` (in this environment,
`$DSH_HOME` is `/Users/christian/.codex2/.dsh`).

## Configure

Edit `src/pricing-projection.ts`:

1. Change `PRICING` if you switch model.
2. Change `peakWindowsUtc` only if DeepSeek changes its tariff windows.
3. Rebuild with `pnpm run build` (or use the documented live workflow).

The displayed price is an estimate when the provider's billing includes items
that are not present in the session usage projection. The code intentionally
keeps pricing local and explicit until a settings screen is added.

DeepSeek currently documents peak windows as 09:00–12:00 and 14:00–18:00
Beijing time. The plugin applies those daily windows in UTC, so Copenhagen's
Danish summer-/wintertime conversion is handled automatically by the browser.
