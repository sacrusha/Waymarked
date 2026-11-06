// The surface (docs/design/surface.md): one map, one sheet, one selection.
//
// Selection: item 0 is the trail, 1..n the stations. Marker taps, prev/next,
// swipes and the URL hash all go through select(); the map, the card and the
// hash follow it.
//
// Portrait: the map fills the screen; the sheet is a scroll container over it
// whose top is a transparent spacer (touches there reach the map). Scrolling
// raises the card from peek to full extent, after which its content scrolls
// under the sticky head. Landscape and desktop: the same elements side by side
// with a draggable divider.

import "@fontsource-variable/public-sans";
import "./style.css";
import trail from "virtual:trail";
import { renderCard } from "./card.ts";
import { TrailMap, type View } from "./map.ts";
import { CARD_DEFAULT_SHARE, cardLimits, clampCard } from "./layout.ts";
import { Player } from "./player.ts";
import { Here } from "./here.ts";
import { Walking, type Mode } from "./walking.ts";
import { Guide } from "./guide.ts";
import { session, store } from "./store.ts";
import { uiStrings } from "./strings.ts";
import { mountLanguage, pickLanguage, textFor } from "./language.ts";

const lang = pickLanguage(trail);
const s = uiStrings(lang);
const last = trail.items.length - 1;

const root = document.documentElement;
const surface = document.getElementById("app")!;
// The surface is as tall as the window the visitor sees: a browser can lay a
// fixed page out under its own toolbar (Samsung Internet), and the sheet's
// bounds and the visible map are both measured from this one height (viewH).
const fitSurface = () => root.style.setProperty("--view-h", `${innerHeight}px`);
fitSurface();
addEventListener("resize", fitSurface);
/** The surface's height: the screen the sheet and the map share. */
const viewH = () => surface.clientHeight;
const sheet = document.getElementById("sheet")!;
const spacer = sheet.querySelector<HTMLElement>(".sheet-spacer")!;
const card = document.getElementById("card")!;
const divider = document.getElementById("divider")!;
const sideBySide = matchMedia("(min-aspect-ratio: 1/1)");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

if (trail.theme.accent) root.style.setProperty("--accent", trail.theme.accent);
if (trail.theme.accentDark) root.style.setProperty("--accent-dark", trail.theme.accentDark);
if (trail.theme.accent) root.style.setProperty("--accent-tint", mixWithWhite(trail.theme.accent, 0.28));

/** A hex colour mixed with white (share = the colour's part), for pale fills. */
function mixWithWhite(hex: string, share: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const ch = (shift: number) => Math.round(((v >> shift) & 255) * share + 255 * (1 - share));
  return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`;
}
sheet.setAttribute("aria-label", s.sheet);
root.lang = lang;
divider.setAttribute("aria-label", s.resize);

card.innerHTML = `<header class="card-head"></header><div class="card-body"></div><footer class="card-end"></footer>`;
const head = card.querySelector<HTMLElement>(".card-head")!;
const body = card.querySelector<HTMLElement>(".card-body")!;
const end = card.querySelector<HTMLElement>(".card-end")!;
const tx = textFor(trail, lang);
const player = new Player(card, tx(trail.items[0].title), s);

// --- where the visitor was (survives reload and tab discard) -------------

interface Saved {
  n: number;
  /** Sheet position as the screen y of the card's top, as a fraction of the viewport. */
  sheetTop: number;
  /** Scroll offset inside the card once it is at full extent. */
  inner: number;
  view: View;
  /** Walking help's camera mode (walking.ts). */
  mode?: Mode;
}
const SAVE_KEY = `${trail.id}:where`;
function readSaved(): Saved | undefined {
  try {
    const v = JSON.parse(session.get(SAVE_KEY) ?? "null");
    return v && typeof v.n === "number" ? v : undefined;
  } catch {
    return undefined;
  }
}

const hashN = parseHash();
const saved = readSaved();
const resume = saved && saved.n === hashN ? saved : undefined;

let current = hashN;
const tmap = new TrailMap(document.getElementById("map")!, trail, lang, s, (n) => select(n), resume?.view);
// The language toggle (a change reloads; where the visitor is has been saved first).
mountLanguage(tmap.map, trail, lang, s, () => saveNow());

// Walking help (docs/design/surface.md): the visitor's position on the map, and the way in the peek row.
const here = new Here();
const walking = new Walking(tmap, here, {
  tools: document.getElementById("map-tools")!,
  visible: () => mapPadding(),
  s,
  lang,
  onMode: () => save(),
});
const guide = new Guide(trail, here, tmap, head, s, lang);
// Location once allowed comes back on the next visit without a tap; the browser asks nothing then.
here.onChange((what) => {
  if (what !== "state") return;
  if (here.state === "on") store.set("here", "on");
  if (here.state === "denied") store.set("here", "");
});

// Dev servers only: the map and walking help on window, for agents' scripted checks in a headless browser.
if (import.meta.env.DEV) Object.assign(window, { __map: tmap.map, __here: here, __walking: walking });

// --- sheet geometry --------------------------------------------------------

const portrait = () => !sideBySide.matches;
/** Scroll offset at which the card's top reaches the top of the sheet (full extent). */
const fullExtent = () => spacer.offsetHeight;
/** Screen y of the card's top edge. */
function cardTop(): number {
  return portrait() ? card.getBoundingClientRect().top : 0;
}
function setCardTop(y: number, smooth = false) {
  if (!portrait()) return;
  const top = sheet.getBoundingClientRect().top;
  const target = Math.max(0, Math.min(fullExtent(), top + fullExtent() - y));
  sheet.scrollTo({ top: target, behavior: smooth && !reduceMotion.matches ? "smooth" : "auto" });
}

/** Screen y where the map stops showing (portrait): the card's top, or the sheet's once the card's text scrolls under its head. */
function mapBottom(): number {
  return Math.max(cardTop(), sheet.getBoundingClientRect().top);
}

/**
 * The strip above a raised sheet is the map's: the visitor, their heading,
 * the selected station (docs/design/surface.md, Controls). As the strip
 * shrinks towards this height the controls slide out, the basemap and
 * language choices up off the screen, the map's buttons down under the card,
 * and they come back as it grows. Their form never changes, so there is
 * nothing to learn, and lowering the sheet, the gesture for more map, is
 * what brings them back. The attribution stays.
 */
const MAP_STRIP = 140;
const topControls = document.querySelector<HTMLElement>(".maplibregl-ctrl-top-left");
const tools = document.getElementById("map-tools")!;
/** The top controls' height (the basemap choice and the language toggle, those the trail has), without their slide. */
const topControlsHeight = () => (topControls ? topControls.offsetTop + topControls.offsetHeight : 0);
/** Map kept clear at the top for those controls. */
const mapTop = () => topControlsHeight() + 8;
/** How far out the controls have slid: 0 (in place) to 1 (gone). */
function controlsOut(): number {
  if (!portrait()) return 0;
  const h = topControlsHeight();
  return Math.min(1, Math.max(0, (MAP_STRIP + h - mapBottom()) / Math.max(1, h)));
}

/**
 * The part of the map the sheet leaves visible, as MapLibre padding: the view
 * that counts for the in-view test (docs/design/surface.md, Camera), clear of
 * the top controls as far as they are still in.
 */
function mapPadding() {
  if (!portrait()) return { top: mapTop(), bottom: 24, left: 24, right: 24 };
  const bottom = mapBottom();
  const top = Math.max(8, Math.round(mapTop() * (1 - controlsOut())));
  return { top, bottom: viewH() - bottom + 16, left: 24, right: 24 };
}

/** What the sheet covers of the map (portrait), for the bounds (docs/design/surface.md, Bounds). */
function covered() {
  return { top: 0, bottom: portrait() ? Math.max(0, Math.round(viewH() - mapBottom())) : 0, left: 0, right: 0 };
}

/**
 * The peek: the head, and below it the first half-line of what the card
 * opens with, cut off, so the sheet shows there is more (docs/design/surface.md, Depth).
 */
function peekHeight(): number {
  const first = body.firstElementChild as HTMLElement | null;
  const lead = first ? first.offsetTop - body.offsetTop : 0;
  const half = parseFloat(getComputedStyle(body).lineHeight) / 2 || 12;
  return Math.round(head.offsetHeight + lead + half);
}
const setPeek = () => root.style.setProperty("--peek", `${peekHeight()}px`);
new ResizeObserver(setPeek).observe(head);
/** Minimised: the sheet at its peek. */
const atPeek = () => portrait() && sheet.scrollTop < 4;

// --- selection ---------------------------------------------------------------

function parseHash(): number {
  const n = Number(location.hash.replace(/^#/, ""));
  return Number.isInteger(n) && n >= 0 && n <= last ? n : 0;
}

function render(n: number) {
  const parts = renderCard(trail, n, lang, s);
  head.innerHTML = parts.head;
  body.innerHTML = parts.body;
  end.innerHTML = parts.end;
  card.dataset.n = String(n);
  setPeek();
  player.show();
  card.setAttribute("aria-label", parts.label);
  guide.show(n);
  const trailTitle = tx(trail.items[0].title);
  document.title = n === 0 ? trailTitle : `${parts.label} – ${trailTitle}`;
}

function select(n: number, opts: { walk?: boolean; from?: number; fromHistory?: boolean } = {}) {
  if (n < 0 || n > last) return;
  const was = current;
  const changed = n !== was;
  // Minimised, the sheet hops once as the card changes: it scrolls, there is more (docs/design/surface.md, Depth).
  const hop = changed && !opts.walk && atPeek();
  current = n;
  render(n);
  if (changed && !reduceMotion.matches) {
    const dir = opts.from ?? Math.sign(n - was);
    const slideIn = [
      { transform: `translateX(${dir * 40}px)`, opacity: 0.35, easing: "cubic-bezier(.2,.7,.3,1)" },
      { transform: "none", opacity: 1 },
    ];
    // The hop follows the slide, in one animation: both move the card's transform.
    const up = "cubic-bezier(.25,.7,.45,1)", down = "cubic-bezier(.55,0,.75,.45)";
    const slideAndHop = [
      { ...slideIn[0], offset: 0 },
      { transform: "translateY(0)", opacity: 1, offset: 0.3, easing: up },
      { transform: "translateY(-18px)", offset: 0.52, easing: down },
      { transform: "translateY(0)", offset: 0.72, easing: up },
      { transform: "translateY(-5px)", offset: 0.85, easing: down },
      { transform: "translateY(0)", offset: 1 },
    ];
    card.animate(hop ? slideAndHop : slideIn, { duration: hop ? 740 : 220 });
  }
  // Each station change is a history entry: Back steps back through the cards.
  if (changed && !opts.fromHistory) history.pushState(null, "", n === 0 ? location.pathname + location.search : `#${n}`);

  if (opts.walk) {
    // The one transition the site initiates: walk on, sheet down to peek.
    if (portrait()) sheet.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    else sheet.scrollTop = 0;
  } else if (portrait()) {
    // Keep the sheet where the visitor had it; if they were reading inside
    // the previous card, start the new one at its top.
    if (sheet.scrollTop > fullExtent()) sheet.scrollTop = fullExtent();
  } else {
    sheet.scrollTop = 0;
  }

  // Walking on, the sheet is on its way down: the view is the one above the peek.
  const padding = opts.walk && portrait() ? { ...mapPadding(), top: mapTop(), bottom: (peekHeight() || 120) + 16 } : mapPadding();
  tmap.select(n);
  // Following the visitor, the map keeps them in place and only zooms out to show the station too;
  // the overview is the whole trail, so it ends following.
  if (n === 0) walking.setMode("free");
  if (n === 0 || !walking.reveal(trail.items[n].position!, padding)) tmap.reveal(n, padding);
  save();
}

card.addEventListener("click", (e) => {
  const go = (e.target as Element).closest<HTMLElement>("[data-go]");
  if (!go) return;
  select(Number(go.dataset.go), { walk: go.dataset.walk === "1" });
});

// Back/Forward through those entries, or a hash typed or followed in the same tab.
const fromUrl = () => {
  const n = parseHash();
  if (n !== current) select(n, { fromHistory: true, from: Math.sign(n - current) });
};
addEventListener("popstate", fromUrl);
addEventListener("hashchange", fromUrl);

addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target as HTMLElement;
  if (t.closest("input, textarea, select, .maplibregl-canvas, [role=separator]")) return;
  if (e.key === "ArrowRight" && current < last) select(current + 1, { from: 1 });
  else if (e.key === "ArrowLeft" && current > 0) select(current - 1, { from: -1 });
});

// --- swipe along the trail -----------------------------------------------------

{
  let g: { id: number; x0: number; y0: number; t0: number; dx: number; axis?: "x" | "y" } | null = null;
  let swallowClick = false;
  const reset = (animate: boolean) => {
    card.style.transition = animate ? "transform .18s ease-out" : "";
    card.style.transform = "";
    if (animate) setTimeout(() => (card.style.transition = ""), 200);
  };
  card.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    if ((e.target as Element).closest("input[type=range]")) return; // the audio position slider drags sideways
    g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, dx: 0 };
  });
  card.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.axis) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        g.axis = "x";
        card.setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > 10) {
        g = null; // vertical: the browser scrolls the sheet
        return;
      } else return;
    }
    const target = current + (dx < 0 ? 1 : -1);
    g.dx = target < 0 || target > last ? dx * 0.25 : dx;
    card.style.transform = `translateX(${g.dx}px)`;
  });
  const finish = (e: PointerEvent) => {
    if (!g || e.pointerId !== g.id) return;
    const { dx, t0, axis } = g;
    g = null;
    if (axis !== "x") return;
    swallowClick = true;
    setTimeout(() => (swallowClick = false), 400);
    const dir = dx < 0 ? 1 : -1;
    const target = current + dir;
    const fast = Math.abs(dx) / Math.max(1, e.timeStamp - t0) > 0.5;
    if (e.type === "pointerup" && target >= 0 && target <= last && (Math.abs(dx) > card.offsetWidth * 0.22 || (fast && Math.abs(dx) > 30))) {
      reset(false);
      select(target, { from: dir });
    } else reset(true);
  };
  card.addEventListener("pointerup", finish);
  card.addEventListener("pointercancel", finish);
  card.addEventListener(
    "click",
    (e) => {
      if (swallowClick) {
        e.preventDefault();
        e.stopPropagation();
        swallowClick = false;
      }
    },
    true,
  );
}

// --- divider (side by side) ------------------------------------------------------

{
  const KEY = `side-width`;
  let wanted = Number(store.get(KEY)) || 0; // 0: the default share
  const apply = () => {
    const width = surface.clientWidth;
    const w = clampCard(wanted || width * CARD_DEFAULT_SHARE, width);
    const { min, max } = cardLimits(width);
    root.style.setProperty("--side-w", `${w}px`);
    divider.setAttribute("aria-valuemin", String(min));
    divider.setAttribute("aria-valuemax", String(max));
    divider.setAttribute("aria-valuenow", String(w));
    return w;
  };
  const layout = () => {
    divider.hidden = portrait();
    surface.dataset.layout = portrait() ? "sheet" : "side";
    apply();
  };
  layout();
  addEventListener("resize", apply);
  sideBySide.addEventListener("change", () => {
    layout();
    requestAnimationFrame(() => tmap.reveal(current, mapPadding()));
  });

  let dragging = false;
  divider.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    divider.setPointerCapture(e.pointerId);
    surface.classList.add("resizing");
  });
  divider.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    wanted = e.clientX - surface.getBoundingClientRect().left;
    wanted = apply(); // hold the limit, so dragging back starts from it
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    surface.classList.remove("resizing");
    store.set(KEY, String(wanted));
  };
  divider.addEventListener("pointerup", stop);
  divider.addEventListener("pointercancel", stop);
  divider.addEventListener("dblclick", () => {
    wanted = 0;
    apply();
    store.set(KEY, "");
  });
  divider.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 80 : 24;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const { min, max } = cardLimits(surface.clientWidth);
    const now = sheet.offsetWidth;
    wanted = e.key === "Home" ? min : e.key === "End" ? max : now + (e.key === "ArrowLeft" ? -step : step);
    wanted = apply();
    store.set(KEY, String(wanted));
  });
}

// --- the handle: dragging it does what scrolling does (portrait) -------------------
// Touch already scrolls the sheet natively; this gives a mouse the same grip.

head.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || e.button !== 0 || !portrait()) return;
  if ((e.target as Element).closest("button, a")) return;
  e.preventDefault();
  const y0 = e.clientY, s0 = sheet.scrollTop;
  head.setPointerCapture(e.pointerId);
  surface.classList.add("dragging-sheet");
  const move = (ev: PointerEvent) => (sheet.scrollTop = s0 - (ev.clientY - y0));
  const up = () => {
    head.removeEventListener("pointermove", move);
    head.removeEventListener("pointerup", up);
    head.removeEventListener("pointercancel", up);
    surface.classList.remove("dragging-sheet");
  };
  head.addEventListener("pointermove", move);
  head.addEventListener("pointerup", up);
  head.addEventListener("pointercancel", up);
});

// --- saving where the visitor was ---------------------------------------------------

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 250);
}
function saveNow() {
  const data: Saved = {
    n: current,
    sheetTop: portrait() ? Math.max(0, cardTop()) / viewH() : 0,
    inner: Math.max(0, sheet.scrollTop - (portrait() ? fullExtent() : 0)),
    view: tmap.view(),
    mode: walking.mode,
  };
  session.set(SAVE_KEY, JSON.stringify(data));
}
sheet.addEventListener("scroll", save, { passive: true });

// The map's buttons ride above the sheet's top edge (portrait), within reach of a thumb.
// The bounds follow the sheet too: they hold for the map it leaves visible;
// and the controls give the strip above a raised sheet to the map (MAP_STRIP).
function placeTools() {
  root.style.setProperty("--card-top", `${Math.round(portrait() ? cardTop() : viewH())}px`);
  const out = controlsOut();
  root.style.setProperty("--top-controls-out", `${Math.round(out * (topControlsHeight() + 8))}px`);
  root.style.setProperty("--tools-out", `${Math.round(out * (tools.offsetHeight + 22))}px`);
  surface.dataset.controls = out >= 1 ? "out" : "";
  tmap.setCovered(covered());
  walking.nudge();
}
sheet.addEventListener("scroll", placeTools, { passive: true });
addEventListener("resize", placeTools);
new ResizeObserver(placeTools).observe(head);
tmap.map.on("moveend", save);
// Phones discard tabs after screen-lock; hidden is the last reliable moment.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") (clearTimeout(saveTimer), saveNow());
});

// --- start ----------------------------------------------------------------------------

// Walking help resumes where it was (a tab discarded after screen-lock), and
// location comes back on a later visit, both only where the browser has
// already allowed it: no prompt without a tap.
if (store.get("here") === "on" || (resume?.mode && resume.mode !== "free")) {
  void Here.granted().then((ok) => {
    if (!ok) return;
    here.start(false);
    if (resume?.mode && resume.mode !== "free") walking.setMode(resume.mode, { quiet: true });
  });
}

render(current);
requestAnimationFrame(() => {
  setPeek();
  if (resume) {
    if (portrait()) {
      if (resume.inner > 0) sheet.scrollTop = fullExtent() + resume.inner;
      else setCardTop(resume.sheetTop * viewH());
    } else sheet.scrollTop = resume.inner;
    tmap.select(current); // the camera is where it was
  } else {
    // Arriving (QR code, link, first visit): the sheet half open.
    setCardTop(viewH() * 0.5);
    tmap.select(current);
  }
  // The bounds once the sheet is in place: the saved view was inside them, and stays as it was.
  tmap.setCovered(covered());
  if (!resume) tmap.frame(current, mapPadding());
  requestAnimationFrame(placeTools);
});
