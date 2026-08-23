# Geometry API: animation contract

What the motion system needs from the geometry response, and why.

Written from the client side, because the client is what breaks when the
contract is wrong. Implemented in `../mandala-generator`, consumed by
`src/mandala/motion/`.

---

## The two problems this solves

**1. Only three things animate.** The renderer animates the day, week and month
placements. Labels, arc labels, intention icons and the centre hub are rendered
statically and appear fully formed at frame one — so month abbreviations are
legible before the petal carrying them exists. There is no way to express "this
text belongs to that petal" today, so the client hardcodes three rings and
ignores everything else.

**2. The client re-derives geometry the generator already knows.** The fold
needs each shape's inner crease and its length along the spoke. Both are read at
runtime with `getBBox()`, which needs real layout, cannot run headless, and
falls back to `0` silently when it fails — degrading the fold to pivoting about
the shape's middle with nothing reported. The checks carry a hardcoded
`SHAPE_EXTENTS` table purely to stand in for it, and that table has already been
wrong once (the week petal's pivot was recorded as `10`; it is `35.745`).

---

## Change 1 — declare animation groups on `renderOrder`

Each entry gains an optional `animation` field. Absent or `null` means the
element renders statically, as everything outside the three rings does today.

```js
const renderOrder = [
  { key: 'background-rect',       type: 'geometry' },
  { key: 'months.shapes',         type: 'asset',
    animation: { group: 'months', instanceKey: 'itemNumber' } },
  { key: 'months.labels',         type: 'geometry',
    animation: { group: 'months', instanceKey: 'itemNumber' } },
  { key: 'months.intentionIcons', type: 'asset',
    animation: { group: 'months', instanceKey: 'month' } },
  { key: 'hub',                   type: 'geometry' },
];
```

| field | meaning |
| --- | --- |
| `group` | Which animation group this element joins. |
| `instanceKey` | The field on each item identifying which instance it belongs to. Members with the same value end up in the same `<g>`. |

The client builds one `<g>` per distinct `instanceKey` value and appends every
member into it. The fold transform goes on that `<g>`, so **membership is the
whole answer** — anything inside moves with its group, and nothing needs to
declare whether it animates independently.

### Constraint: members carry placement-local coordinates

A group's `<g>` already carries its instance's
`translate(x, y) rotate(...) scale(...)`. Anything appended inside it inherits
that, so a member holding **absolute** mandala coordinates is transformed twice
and lands nowhere near where it was meant to.

Members must be emitted relative to their instance's origin — `{ x: 0, y: 12 }`
meaning *12 units inward of this petal's centre*, not a position in the mandala.

**Text is the exception.** A `<text>` drawn in the instance's frame sits under
the placement `scale`, and Chrome will not paint small `<textPath>` text there:
the glyphs lay out with correct metrics, `getBBox()` and `elementFromPoint()`
both find them, and nothing is drawn. A counter-scale inside the instance does
not help. So text members arrive in **mandala coordinates** and are wrapped in
`inversePlacement()` on the way into the instance — the same treatment computed
fragments get. They still fold with their instance, because the fold is
conjugated into its frame either way. `renderAnchoredLabels` does this.

A member also inherits the instance's **paint**, which is a separate trap with
the same symptom. `.month-placement` sets a 1px stroke on everything under it;
on a 4px glyph that is wider than the stems, so every letter paints in the
outline colour and the text vanishes into the petal — while still highlighting
under a cursor drag, which is how it announces itself. Anything joining a group
states its own `fill` and `stroke`.

### Constraint: group members must be contiguous in paint order

A group paints where its **first** member sits, because that is where its `<g>`
is created. Any non-member between two members gets restacked.

This was not hypothetical. The order used to be:

```
10  months.shapes            ← group member
11  days.labels.monthNames   ← NOT a member
12  months.labels            ← group member
```

so grouping `months.labels` would have pulled it above `days.labels.monthNames`.
The generator now emits `months.labels` directly after `months.shapes`, with
`days.labels.monthNames` after both — and for the yearly mandala that step is
empty anyway, because the month names ride their petals rather than sitting at a
radius of their own.

---

## Change 2 — per-group bounds

The highest-value item. Each group declares the local bounding box of one
instance, in the shape's own coordinates:

```js
animationGroups: {
  months: { bounds: { x: -42.74, y: -64.22, width: 85.48, height: 128.44 } },
  days:   { bounds: { x: -5.315, y: -8.535, width: 10.63, height: 17.07 } },
  weeks:  { bounds: { x: -35.72, y: -35.745, width: 71.44, height: 71.49 } },
}
```

The client derives two things from this:

- **Fold pivot** = `y + height` — the shape's innermost point, since `-Y` points
  outward in every placement's local frame.
- **Travel** — measured in multiples of `height`, so one setting means the same
  thing on every ring. (Scaling travel to ring radius instead made day segments
  move three times their own length while month petals moved a quarter of
  theirs.)

These numbers already exist: every shape def carries a centering transform of
exactly half its viewBox — `translate(-5.315, -8.535)` for a `10.63 × 17.07` day
segment — so the generator can emit bounds without measuring anything.

Shipping this removes, on the client: the runtime `getBBox()` call, the silent
`?? 0` pivot fallback, the `radius * 0.12` extent fallback, and the entire
`SHAPE_EXTENTS` table in the checks.

---

## Change 3 — text on the petals is new geometry

Confirmed while prototyping: `monthAbbrLabelRing` sits at radius 43–47 while the
month petals span 81–171. Today's month abbreviations are hub furniture, not
petal furniture, and this response populates no label instances at all.

So petal text is not a regrouping of existing labels — it is new output. Each
label needs a position in **placement-local** coordinates (the petal is centred
on its placement origin) and the `instanceKey` linking it to its petal.

Text inside a group inherits the fold, including `scale(foldWidth, 1)`, so it
compresses horizontally through the unfold and resolves upright — printed on the
paper. That is intended.

---

## What does not change

**Habit tracking stays separate.** Day/week/month identity, `cssClass` on each
placement, and the completion maps are untouched. The animation only ever writes
`transform` and `opacity` — never class or fill — so completion styling and
motion cannot collide, and a habit checked mid-entrance simply lands.

`cssClass` stays on the instance, not on individual members.

---

## Client migration

The renderer will read `animation` when present and fall back to deriving the
three rings exactly as it does today when it is absent, so the app keeps working
against an unchanged response while the generator is updated. Same for bounds:
measured via `getBBox()` when not supplied.

Once the response carries both, `RING_SPECS` in `mandalaRenderer.js` — which
hardcodes ring names, class names, completion flags and whether each ring
inlines or uses `<use>` — becomes data and can be deleted.
