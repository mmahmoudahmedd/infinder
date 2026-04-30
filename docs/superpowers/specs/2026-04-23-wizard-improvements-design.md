# Quick Wizard Improvements — Design

**Date:** 2026-04-23
**Status:** Approved

## Goal

Improve the Quick Wizard in SmartAssistant with 8 enhancements: Sharia step, investment amount step, summary screen, back button, risk descriptions, dynamic label, result explanation, and animated transitions.

## Files Changed

| File | Change |
|---|---|
| `frontend/src/pages/SmartAssistant.tsx` | Add steps 3-5, back button, animations, dynamic label/explanation |
| `backend/routes/investments.js` | Add Sharia-adjusted templates, dynamic label, explanation text |

## Wizard Flow (5 steps → summary → result)

```
Step 0: Goal         (Save & preserve / Grow & build)
Step 1: Time horizon (Short / Medium / Long)
Step 2: Risk         (Lower / Balanced / Higher) + descriptions
Step 3: Sharia       (Yes, halal only / No preference)   ← NEW
Step 4: Amount       (How much to invest?)                ← MOVED from result
Step 5: Summary      (Confirm all answers)                ← NEW
Result: Pie chart + dynamic label + explanation
```

Every step has a back arrow (top-left) except step 0.
Progress bar shows 5 filled segments.

## Step Details

### Step 2: Risk — with descriptions
Each option shows a subtitle:
- **Lower** — "I prefer stable returns over big gains"
- **Balanced** — "Some ups and downs are fine"
- **Higher** — "I'm comfortable with volatility for better long-term returns"

### Step 3: Sharia (NEW)
Two options:
- **Yes, halal only** — "Avoid interest-based products"
- **No preference** — "Include all investment types"

### Step 4: Investment amount (MOVED)
Input field: "How much would you like to invest?" with EGP prefix.
Shows available balance. Validate > 0 before proceeding to summary.

### Step 5: Summary (NEW)
Confirmation card showing all answers:
> "You chose: **Grow & build** · **Long-term** · **Higher risk** · **Halal** · **EGP 5,000**"

Two buttons: **Confirm** (calls /api/investments/robo) and **← Edit** (goes back to step 0).

## Backend Changes (`backend/routes/investments.js`)

### Add Sharia templates to ROBO_TEMPLATES
Sharia portfolios replace bonds with more gold/stocks (bonds are interest-based):
```js
preserve_short_low_halal: { stocks: 15, baskets: 10, bonds: 0, gold: 75 },
preserve_short_med_halal: { stocks: 20, baskets: 20, bonds: 0, gold: 60 },
grow_long_high_halal:     { stocks: 50, baskets: 30, bonds: 0, gold: 20 },
balanced_halal:           { stocks: 45, baskets: 25, bonds: 0, gold: 30 },
```

### Accept `isSharia` in `/robo` endpoint
Add `isSharia` to the request body. Append `_halal` suffix to the key when true.

### Return dynamic label and explanation
The response adds two new fields:
- `label` — human-readable name, e.g. "Long-term Halal Growth Portfolio"
- `explanation` — one sentence, e.g. "Because you chose long-term + higher risk + halal, we weighted toward stocks and baskets with a gold hedge instead of bonds."

## Frontend Changes (`frontend/src/pages/SmartAssistant.tsx`)

### New state variables
```ts
const [sharia, setSharia] = useState<boolean | null>(null); // step 3
// investAmount already exists — move its usage from result to step 4
```

### Step counter update
`wizardStep` goes 0–5 (was 0–2). Step 5 is summary, result is shown after confirmation (step 6 effectively, or a separate boolean `showResult`).

### Back button
Each step renders:
```tsx
{wizardStep > 0 && (
  <button onClick={() => setWizardStep(s => s - 1)} className="...">← Back</button>
)}
```

### Animations
Use `framer-motion` `AnimatePresence` + `motion.div` with `key={wizardStep}` for slide-in effect:
```tsx
<AnimatePresence mode="wait">
  <motion.div key={wizardStep} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
    {/* step content */}
  </motion.div>
</AnimatePresence>
```

### Dynamic label and explanation on result
Backend now returns `label` and `explanation`. Display them on the result card:
```tsx
<h2>{wizardLabel}</h2>
<p className="text-sm text-gray-600 mt-2">{wizardExplanation}</p>
```

Add `wizardExplanation` state variable (string).

### Investment amount moved
Remove the amount input + Confirm button from the result screen. They now live in step 4. The result screen only shows the pie chart, label, explanation, and a "Invest now" button that calls `confirmInvest()` directly (amount already captured).

## Out of Scope
- No changes to the Chat with AI mode
- No backend changes beyond the robo endpoint
- No new pages or routes
