# Decision Points

## DP1 · The nudge — warn + encourage, never shame or block

When the weekly target is crossed, the app shows a prominent banner that states the overshoot plainly, then points at the user's biggest emission category with one concrete, quantified swap (e.g. "swapping one non-veg meal for veg saves 1.5 kg CO₂"). We chose warn-plus-encourage because a tracker only works if people keep logging: blocking entries would corrupt the data the app exists to collect, and shaming is well documented to cause abandonment rather than behavior change. Honest data plus an actionable next step beats a pretty streak.

## DP2 · Absurd input — soft-block with explicit confirmation, hard-block the impossible

Each activity type has a plausibility ceiling (e.g. 1,500 km of car travel in one entry). Beyond it, the entry is rejected with a clear explanation and can only be logged by explicitly confirming "yes, it's correct" (UI button, or `confirmAbsurd: true` via the API). Beyond a second, physically-impossible ceiling (e.g. 50,000 km of driving), the entry is rejected outright. We chose this two-tier approach because a 500,000 km trip is almost always a typo — silently accepting it would destroy every chart and target — but a hard rejection of merely *unusual* values would be wrong too: a real long-haul road trip or a year's electricity logged at once should stay possible with one deliberate click. Zero, negative, and non-numeric quantities are always rejected.

## DP3 · The week — ISO 8601 (Monday 00:00), with a pace projection mid-week

A week runs Monday through Sunday, matching ISO 8601 and how most people plan ("this week" starts Monday), and giving the target a fixed, predictable reset rather than a confusing rolling window. Mid-week the app doesn't just show "used X of Y kg" — it shows the day of the week and a projected end-of-week total based on the daily average so far, flagged on-track or over. Raw progress alone misleads: being at 40% of budget on Tuesday *feels* fine but is actually an over-target pace, and the projection makes that visible while there's still time to adjust.
