# Agent Note: Cost/PEAK badge in the composer footer

Status: implemented

## Decision

The cost badge registers in `conversation.composer.dock`, after the existing
stats registration, so the badge remains tied to the active composer and does
not occupy header space. `InputBar` owns a centered wrapping footer container;
the existing stats line remains its first flex item and can elide when the
badge needs room.

The tariff display derives every transition from DeepSeek's fixed UTC weekday
windows. Weekend dates contribute no transition candidates, so Friday after
the final window naturally resolves to Monday's first PEAK. A single 30-second
clock drives both the displayed tariff and countdown, preventing them from
drifting apart at a boundary.

## Verification

The focused schedule tests cover peak end, next peak, the Friday-to-Monday
weekend gap, and both summer/winter calendar dates. The existing composer and
stats UI tests continue to pass.
