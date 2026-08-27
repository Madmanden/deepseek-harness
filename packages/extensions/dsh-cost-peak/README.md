# dsh-cost-peak

Small local plugin for DeepSeek Harness. It adds a session-header utility with:

- cumulative provider-reported token usage from DSH's existing `tokenUsage` projection
- an estimated USD session cost
- `PEAK` / `OFF-PEAK` based on DeepSeek's published Beijing windows, converted
  automatically for Copenhagen users through timezone-aware formatting

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

Edit `src/client/CostPeakHeader.tsx`:

1. Change `PRICING` if you switch model. The current defaults are
   DeepSeek-V4-Flash: `$0.0028/M` cache hit, `$0.14/M` cache miss, and
   `$0.28/M` output.
2. Change `PEAK_WINDOWS` only if DeepSeek changes its tariff windows.
3. Rebuild with `pnpm --filter dsh-cost-peak bundle`.

The displayed price is an estimate when the provider's billing includes items
that are not present in the session usage projection. The code intentionally
keeps pricing local and explicit until a settings screen is added.

DeepSeek currently documents peak windows as 09:00–12:00 and 14:00–18:00
Beijing time. That is normally 03:00–06:00 and 08:00–12:00 in Copenhagen
during Danish summer time, and 02:00–05:00 and 07:00–11:00 during winter time.
