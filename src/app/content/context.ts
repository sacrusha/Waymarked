// The seam between the shell and the content framework (docs/design/layers.md).
//
// The shell owns the card's head (badge, title, the peek's slot, prev /
// overview / next), its end ("Next" and the engine's line), the map, the
// settings and audio. A body renderer owns what lies between: it gets the
// item and what the shell has prepared for it, and returns the body's HTML.
//
// What the shell relies on in a body:
// - Its first element is the lead: the peek shows the head and half a line
//   into it, the cut-off that says the sheet scrolls (docs/design/surface.md, Depth).
// - A `[data-go="n"]` button selects item n, as the shell's own buttons do.
// - Elements that take a sideways drag of their own (a slider, a gallery)
//   carry `data-no-swipe`, so the drag doesn't change the card.
// - A `.player[data-audio]` element is a view of the shell's audio
//   (player.ts binds it; content/player-view.ts is the framework's).

import type { Item, Localized, Trail } from "../trail-types.ts";
import type { Strings } from "../strings.ts";

/** A recording as the shell plays it: the card's controls, the lock screen. */
export interface Track {
  url: string;
  /** What the lock screen names it. */
  label: string;
  /** An image URL for the lock screen. */
  art?: string;
  /** Read by a synthetic voice, which the player says. */
  synthetic?: boolean;
}

export interface BodyContext {
  trail: Trail;
  item: Item;
  lang: string;
  /** A trail text in the language shown, else the source language's. */
  tx: (l?: Localized) => string;
  /** The engine's own words in the language shown. */
  s: Strings;
  /** The item's audio in this language; none where it has none. */
  track?: Track;
  /** The note a machine-translated text opens with, or "". */
  machineNote: string;
  /** Item 0 only: the station list, the shell's navigation, for the body to place. */
  stations: string;
}

export type BodyRenderer = (ctx: BodyContext) => string;
