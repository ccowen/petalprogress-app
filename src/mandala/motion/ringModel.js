// ringModel.js
//
// Describes a rendered ring in the terms the motion system needs: how many
// copies of a shape go around it, how far out they sit, and where the first
// copy starts.
//
// Everything here is derived from the geometry API's already-resolved
// placements, which is the reason the motion system needs no server changes.
// A placement arrives carrying its final x/y/rotation/scale; the ring model
// is just those placements read as a group rather than one at a time.

/** Distance of a placement from the mandala centre. */
function radiusOf(placement) {
	return Math.hypot(placement.x, placement.y);
}

/**
 * Summarise one ring.
 *
 * `radius` is averaged rather than taken from the ring data because only the
 * outer ring reports one; the placements always know where they actually sit.
 */
export function describeRing(id, placements) {
	const repeatCount = placements.length;
	if (!repeatCount) {
		return { id, repeatCount: 0, radius: 0, baseRotation: 0 };
	}
	const radius =
		placements.reduce((sum, p) => sum + radiusOf(p), 0) / repeatCount;

	return {
		id,
		repeatCount,
		radius,
		baseRotation: placements[0].angle ?? 0
	};
}

/**
 * How many distinct "scraps" a ring is made of, under a given symmetry order.
 *
 * This is the whole kaleidoscope idea in one number. A real kaleidoscope holds
 * a few loose scraps of paper and the mirrors repeat them into N sectors, so
 * what looks like hundreds of moving pieces is really a handful, multiplied.
 *
 * Applying that here: a 365-segment day ring under 12-fold symmetry is read as
 * ~30 scraps, each appearing once per sector. Instances sharing a scrap index
 * move identically, which is what makes the mirror rather than the individual
 * petal the thing you notice.
 *
 * Rings smaller than the symmetry order collapse to a single scrap -- the
 * 12-month ring under 12-fold symmetry is one shape seen twelve times, which
 * is exactly right.
 */
export function scrapCountFor(repeatCount, symmetryOrder) {
	if (!repeatCount) return 0;
	return Math.max(1, Math.round(repeatCount / symmetryOrder));
}

/** Which scrap a given instance is a mirrored copy of. */
export function scrapIndexOf(instanceIndex, scrapCount) {
	return scrapCount ? instanceIndex % scrapCount : 0;
}
