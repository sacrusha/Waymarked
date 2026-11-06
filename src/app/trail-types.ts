// The shape of a trail as the browser receives it (virtual:trail).
// Built from the trail folder by build/trail.ts; the folder's layout is
// documented in docs/design/trail-content.md.

/** Text per language code; the trail's first language is always present. */
export type Localized = Record<string, string>;

export type LngLat = [number, number];

export interface Basemap {
  label: Localized;
  /** A MapLibre style URL (vector) ... */
  style?: string;
  /** ... or raster tile URLs. */
  tiles?: string[];
  tileSize?: number;
  maxzoom?: number;
  attribution?: string;
}

export interface Image {
  url: string;
  width?: number;
  height?: number;
  caption?: Localized;
  alt?: Localized;
  credit?: string;
  license?: string;
}

/** A publisher's or supporter's logo, shown in item 0's footer. */
export interface Logo {
  url: string;
  width?: number;
  height?: number;
  alt: Localized;
  /** Where the logo links to. */
  href?: string;
}

/** A spoken version of an item's text, in one language. */
export interface Audio {
  url: string;
  /** Made by speech synthesis (listed in the trail's audio.json), not recorded. */
  synthetic: boolean;
}

/** Item 0 is the trail itself, items 1..n the stations in walking order. */
export interface Item {
  /** 0 for the trail, 1..n for stations: the number on the ground signage. */
  n: number;
  title: Localized;
  /**
   * Where room is short (the card's head, the lock screen): what the title
   * says in fewer words, per language; the title where a language has none.
   */
  shortTitle: Localized;
  /** Station fields by key (see Trail.stationFields). */
  fields: Record<string, Localized>;
  /** Rendered HTML of text.<lang>.md, per language. */
  body: Localized;
  images: Image[];
  /** audio.<lang>.mp3 per language, where the folder has one. */
  audio: Record<string, Audio>;
  position?: LngLat;
}

export interface Leg {
  from: number;
  to: number;
  /** Metres along the route, or the straight line where the route has no path. */
  length: number;
  coordinates: LngLat[];
  /** true when no path along the route was found and the leg is a straight line. */
  straight: boolean;
  /**
   * Walking time in minutes at the signposts' pace (build/walk-time.ts), not
   * rounded for display; absent where the route has no heights or the leg is straight.
   */
  minutes?: number;
}

export interface Trail {
  id: string;
  languages: string[];
  /** Languages whose texts are machine translations nobody has reviewed; the card says so. */
  machineTranslated: string[];
  subtitle: Localized;
  publisher: Localized;
  duration: Localized;
  gettingThere: Localized;
  links: { label: Localized; url: string }[];
  stationFields: { key: string; label: Localized }[];
  theme: { accent?: string; accentDark?: string };
  /** How the trail's signs name a station, as inline HTML per language with "{n}" for its number. */
  signLabel: Localized;
  /** The trail's or its publisher's mark: on the cover and beside each station's sign label. */
  mark?: Logo;
  /** The photo that opens item 0. */
  cover?: Image;
  /** The end of item 0: who stands behind the trail. `text` is HTML per language. */
  footer: { logos: Logo[]; text: Localized };
  basemaps: Basemap[];
  /** items[0] is the trail, items[n] station n. */
  items: Item[];
  route: GeoJSON.FeatureCollection;
  legs: Leg[];
  /** Sum of the legs from station 1 to the last, metres. */
  length: number;
  /** Sum of the legs' walking times, minutes; absent unless every leg has one. */
  minutes?: number;
  /** The stations' and the route's extent, [[west, south], [east, north]]. */
  extent: [LngLat, LngLat];
  /** How far the map may go: the trail's extent with its margin, and the matching minimum zoom. */
  limits: { bounds: [LngLat, LngLat]; minZoom: number };
}
