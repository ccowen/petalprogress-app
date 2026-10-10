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

# Second round: the shape itself

Changes 1–3 came from the client breaking. These two come from the opposite
direction — from tuning the fold against the real shapes and running out of
things a transform can express. Both are additive: the client keeps working
against a response that carries neither.

The common thread is that the motion system has exactly one lever per instance,
a `transform` on the placement `<g>`, and an affine transform moves every point
of a shape together. Anything that needs one part of a shape to move relative to
another, or needs the outline itself to change, has to arrive as geometry.

---

## Change 4 — a soft companion path per shape

**The ask.** Shapes begin with rounded corners and sharpen into their finished
form across the fold.

**Why the client cannot.** Corner radius is not a property of a path. Exactly one
shape has one: `shapeForDays.svg` is two `<rect rx=".18" ry=".18">`, and those
rects are 1.7 units tall against a 10.63-unit-wide viewBox that renders about
14.8px across — so the whole morph, fully round to finished, is a little over
one pixel on a 2.4px bar. The shapes where it would read are single paths.
`petalForMonths.svg` is four curve segments meeting at the cardinal points, and
three of those joins are already smooth: it has exactly one sharp corner, the
tip. Rounding it means blunting that point.

Filters are the procedural way to do this and are ruled out: the entrance is
pure 2D transform by design, and 429 filtered nodes will not hold a frame rate.

The client *could* fake the petal tip. That cusp exists because the first
control point of the closing curve sits on the endpoint, so pulling it off
rounds the tip, and interpolating that one number is arithmetic. It would also
be the client hardcoding where a given shape's cusp is and how it was drawn —
the same class of guess that recorded the week petal's pivot as `10` when it is
`35.745`, and that pointed the week ring at a shape twice its real height.

**What is needed.** Per shape, a companion outline with an **identical command
structure** — same commands, in the same order, with the same operand counts,
differing only in the numbers.

```js
animationGroups: {
  months: {
    bounds: { /* Change 2 */ },
    shape: {
      // Byte-identical to the shape file today.
      sharp: 'M84.98,53.44c0,29.2…42.74,.57c0,0,42.24,23.67,42.24,52.86Z',
      // Same letters, same order, same operand count. Only numbers differ:
      // here the `c0,0` that makes the tip a cusp becomes a real control
      // point, and the curve arriving at the tip is adjusted to match.
      soft:  'M84.98,53.44c0,29.2…42.74,.57c9.1,2.4,42.24,23.67,42.24,52.86Z'
    }
  }
}
```

That constraint is the entire point. Two paths with matching structure are two
equal-length lists of numbers, so the client interpolates them with arithmetic:

```js
const morph = (soft, sharp, t) => soft.map((n, i) => n + (sharp[i] - n) * t);
```

Ask for "a rounded variant" without it and you get two paths that need a
path-matching algorithm to interpolate — a dependency, and a per-frame cost
across every animated node.

Three things the generator has to hold to:

| requirement | why |
| --- | --- |
| `sharp` is byte-identical to the shape as drawn today | A finished entrance has to leave the DOM exactly as a render with no motion. There is a check on it. |
| Same command *letters*, absolute or relative | `c` and `C` take the same operand count and mean different things; a swap interpolates to nonsense rather than failing. |
| Same operand count per command | The lerp is index-by-index. A `soft` with one extra segment is silently wrong, not an error. |

**Where it applies.** Month petals inline their shape, so twelve copies morph
independently — twelve `d` writes a frame. The day and week rings render through
`<use>` against one shared def, so a morph there is a *single* write for the
whole ring. That also means every instance in those rings morphs identically,
which is already true of everything else: mirrored copies move identically by
design (see Change 1).

Declaring `shape` for the day ring is probably not worth it at 2.4px. Declaring
it for the months is the reason to do this at all.

---

## Change 5 — tab sub-paths, for folding corners

**The ask.** Corners fold out during the animation — a paper form being opened
flat, a beat per tab.

**Why the client cannot.** The fold is one transform on the instance `<g>`.
An affine transform scales, skews and rotates the whole shape about one origin;
there is no expression in it that rotates a corner about a local crease while
the rest of the shape stays put.

What the client has instead is `hingeBeats`, which breaks the swing into
separate movements and alternates a whole-shape lean between them, so one edge
appears to lead and then the other. It is convincing at a glance and it is not
corner motion — nothing about the shape's interior ever moves relative to
itself.

**What is needed.** The shape arrives already split, each tab carrying its own
hinge as a *line* in placement-local coordinates:

```js
animationGroups: {
  months: {
    bounds: { /* Change 2 */ },
    parts: [
      { key: 'body' },
      { key: 'tab-left',  hinge: { x1: -12.4, y1: -38.0, x2: -30.1, y2: -6.2 } },
      { key: 'tab-right', hinge: { x1:  12.4, y1: -38.0, x2:  30.1, y2: -6.2 } }
    ]
  }
}
```

A line, not a point. Folding a tab flat is a scale perpendicular to its crease,
which for a crease at an arbitrary angle is `rotate(-θ) scale(1, k) rotate(θ)`
about the crease midpoint — and θ comes from the hinge direction. A point would
leave the client inferring the angle from the tab's bounding box, which is the
guess this document exists to stop.

Each part becomes its own element inside the instance `<g>`, so tabs inherit the
placement and the fold and then add their own rotation underneath. Same
containment rule as Change 1: membership is the whole answer.

Four constraints, all of which have a visible failure mode:

- **Tabs must tile the shape exactly.** `body ∪ tabs` is the sharp outline, with
  no gaps. Overlap by a hair rather than leaving one: a hairline gap between a
  tab and the body reads as a light crack running through the petal at full
  size, and it appears only when the tab is flat, which is the one state nobody
  screenshots.
- **Each part states its own `fill` and `stroke`.** The same trap Change 1
  documents for members: `.month-placement` sets a 1px stroke on everything
  under it, and a tab inheriting it gets an outline drawn along the seam where
  there is no real edge.
- **Parts arrive in paint order.** The generator decides whether a tab sits over
  or under the body; the client appends in the order given, as it does for group
  members.
- **Declare parts only where they read.** Three parts across twelve month petals
  is 36 nodes. The same split across 365 day segments is 1095, on a shape 2.4px
  thick.

---

## What the client does without either

Absent `shape`, no morph: the shape renders as it does today. Absent `parts`,
one element per instance, as today. Both degrade to the current behaviour rather
than to a broken one, so the generator can ship them per group and per shape
rather than all at once — months first is the useful order, since months are
where either change is visible.

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
