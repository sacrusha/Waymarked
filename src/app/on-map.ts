// What sits on the map is painted like the map: on canvas, in the map's
// colours. The map stays light whatever the page does (docs/design/brand.md,
// Dark), and a browser that darkens pages by its own rules repaints CSS but
// leaves canvases alone (docs/design/robustness.md). The page elements that
// carry these canvases give only what a page element gives: a button, its
// label, the focus ring, the touch target. Colours are the tokens on :root,
// so a trail's theme.css sets them as it sets any other.

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

/** A token's value (a name starting with --) or a literal colour. */
function colour(css: CSSStyleDeclaration, c: string): string {
  return c.startsWith("--") ? css.getPropertyValue(c).trim() : c;
}

/**
 * Sizes a canvas for a box of w×h CSS pixels at the screen's density,
 * centred on its element, and returns its context in CSS pixels.
 */
function fit(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  Object.assign(canvas.style, { width: `${w}px`, height: `${h}px`, left: `calc(50% - ${w / 2}px)`, top: `calc(50% - ${h / 2}px)` });
  const ctx = canvas.getContext("2d")!; // the map runs on WebGL2, so a 2D context is there
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

interface Shadow {
  y: number;
  blur: number;
  alpha: number;
}

/** A filled circle with a drop shadow; the shadow's offset and blur are in device pixels, so they scale here. */
function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, shadow?: Shadow) {
  const dpr = devicePixelRatio || 1;
  ctx.save();
  if (shadow) {
    ctx.shadowColor = `rgb(0 0 0 / ${shadow.alpha})`;
    ctx.shadowOffsetY = shadow.y * dpr;
    ctx.shadowBlur = shadow.blur * dpr;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

// --- station markers ---------------------------------------------------------

export type MarkerState = "" | "prev" | "next" | "selected";

/**
 * The markers' look, one entry per state: a disc of `size` with an `edge`, for
 * the selection a ring outside it, the number in the trail's font. Prev and
 * next share their colours with the card's buttons (style.css, --prev, --next).
 */
const MARKER: Record<MarkerState, { size: number; edge: number; ring: number; font: number; fill: string; text: string; edgeColour: string; ringColour: string; shadow: Shadow }> = {
  "": { size: 28, edge: 2.5, ring: 0, font: 13, fill: "--marker", text: "--on-marker", edgeColour: "--accent-dark", ringColour: "", shadow: { y: 1, blur: 3, alpha: 0.3 } },
  prev: { size: 30, edge: 2.5, ring: 0, font: 13, fill: "--prev", text: "--on-prev", edgeColour: "--accent-dark", ringColour: "", shadow: { y: 1, blur: 3, alpha: 0.3 } },
  next: { size: 34, edge: 2.5, ring: 0, font: 15, fill: "--next", text: "--on-next", edgeColour: "--accent-dark", ringColour: "", shadow: { y: 1, blur: 3, alpha: 0.3 } },
  selected: { size: 44, edge: 3, ring: 3, font: 18, fill: "--accent-dark", text: "#ffffff", edgeColour: "#ffffff", ringColour: "--accent-dark", shadow: { y: 3, blur: 10, alpha: 0.35 } },
};

/** A station marker: a button whose look is a canvas. */
export function markerElement(n: number, label: string): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "marker";
  el.dataset.n = String(n);
  el.setAttribute("aria-label", label);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  el.append(canvas);
  return el;
}

/** Paints a marker in its state (data-state); a change of size grows or shrinks it briefly. */
export function paintMarker(el: HTMLElement) {
  const state = (el.dataset.state ?? "") as MarkerState;
  const look = MARKER[state] ?? MARKER[""];
  const canvas = el.querySelector("canvas")!;
  const css = getComputedStyle(root);
  const outer = look.size / 2 + look.ring;
  const pad = look.ring + look.shadow.blur + look.shadow.y + 1;
  const box = look.size + 2 * pad;
  const c = box / 2;
  const ctx = fit(canvas, box, box);
  disc(ctx, c, c, outer, colour(css, look.ring ? look.ringColour : look.edgeColour), look.shadow);
  if (look.ring) disc(ctx, c, c, look.size / 2, colour(css, look.edgeColour));
  disc(ctx, c, c, look.size / 2 - look.edge, colour(css, look.fill));
  const n = el.dataset.n ?? "";
  ctx.font = `800 ${look.font}px ${css.getPropertyValue("--font")}`;
  ctx.fillStyle = colour(css, look.text);
  ctx.textAlign = "center";
  const m = ctx.measureText(n);
  ctx.fillText(n, c, c + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);

  const was = Number(el.dataset.size) || look.size;
  el.dataset.size = String(look.size);
  el.style.setProperty("--size", `${look.size}px`);
  if (was !== look.size && !reduceMotion.matches) {
    canvas.animate([{ transform: `scale(${was / look.size})` }, { transform: "none" }], { duration: 180, easing: "ease-out" });
  }
}

// --- the visitor -------------------------------------------------------------

export interface YouLook {
  /** The fix is older than the site trusts: grey, where they were. */
  stale: boolean;
  /** The fix is coarse: the dot fainter. */
  coarse: boolean;
  /** Where the facing comes from, if known: the compass, or the course while walking (fainter). */
  heading: "" | "compass" | "course";
  /** Half the cone's angle, degrees. */
  spread: number;
}

/** The box the visitor is painted in; MapLibre turns it to the heading, so the cone points ahead. */
export const YOU_BOX = 140;

/** The visitor: a dot in a white ring, and the cone of where they face, fading outward. */
export function paintYou(canvas: HTMLCanvasElement, look: YouLook) {
  const css = getComputedStyle(root);
  const ctx = fit(canvas, YOU_BOX, YOU_BOX);
  const c = YOU_BOX / 2;
  if (look.heading) {
    const a = (look.spread * Math.PI) / 180;
    ctx.save();
    ctx.globalAlpha = look.heading === "course" ? 0.7 : 1;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, c, -Math.PI / 2 - a, -Math.PI / 2 + a);
    ctx.closePath();
    ctx.fillStyle = colour(css, "--you-cone");
    ctx.fill();
    // The fade: keep the cone where the gradient is, in proportion to its alpha.
    ctx.globalCompositeOperation = "destination-in";
    ctx.globalAlpha = 1;
    const mask = ctx.createRadialGradient(c, c, 0, c, c, c);
    mask.addColorStop(0.12, "#000");
    mask.addColorStop(1, "transparent");
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, YOU_BOX, YOU_BOX);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = look.coarse ? 0.6 : 1;
  disc(ctx, c, c, 10, "#ffffff", { y: 1, blur: 4, alpha: 0.4 });
  disc(ctx, c, c, 7, colour(css, look.stale ? "--you-stale" : "--you"));
  ctx.restore();
}

/** Calls paint again whenever what it painted may be off: fonts arriving, a new pixel density, the scheme turning. */
export function repaintOnChange(paint: () => void) {
  document.fonts?.ready.then(paint);
  document.fonts?.addEventListener("loadingdone", paint);
  addEventListener("resize", paint);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paint);
}
