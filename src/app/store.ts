// Per-viewer conveniences in browser storage (the basemap, the column width,
// where the visitor was). Storage can be missing or throw (private windows,
// blocked site data); the site then simply starts fresh.

function area(kind: "local" | "session"): Storage | undefined {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function make(kind: "local" | "session") {
  const key = (k: string) => `waymarked:${k}`;
  return {
    get(k: string): string | null {
      try {
        return area(kind)?.getItem(key(k)) ?? null;
      } catch {
        return null;
      }
    },
    set(k: string, v: string) {
      try {
        area(kind)?.setItem(key(k), v);
      } catch {
        /* storage full or blocked: nothing to keep */
      }
    },
  };
}

/** Survives visits: preferences. */
export const store = make("local");
/** Survives reload and the tab being discarded after screen-lock: where the visitor was. */
export const session = make("session");
