// Side-by-side layout: the card column's width limits.
//
// Starting values. The real limits per aspect ratio are open
// (docs/design/surface.md, Not known); they live here so that finding them
// changes one place.

/** The card stays wide enough for its title, fields and orientation row. */
export const CARD_MIN = 300;
/** Wider than this, lines pass a comfortable reading measure. */
export const CARD_MAX = 720;
/** The map keeps at least this share of the width ... */
export const MAP_MIN_SHARE = 0.4;
/** ... and at least this many pixels. */
export const MAP_MIN = 320;
/** Where the divider starts, and returns to on double-click. */
export const CARD_DEFAULT_SHARE = 0.34;

export function cardLimits(width: number): { min: number; max: number } {
  const max = Math.min(CARD_MAX, width - Math.max(MAP_MIN, width * MAP_MIN_SHARE));
  return { min: CARD_MIN, max: Math.max(CARD_MIN, max) };
}

export function clampCard(w: number, width: number): number {
  const { min, max } = cardLimits(width);
  return Math.round(Math.max(min, Math.min(max, w)));
}
