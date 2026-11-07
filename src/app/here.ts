// Where the visitor is and which way they face: GPS, the compass, and the
// GPS course as the compass's fallback while walking. Sensing only; the map
// and the peek row read it (walking.ts, guide.ts).
//
// Permissions: geolocation prompts on first use. The compass needs a
// permission request from a gesture on iOS (DeviceOrientationEvent.
// requestPermission) and none elsewhere. Both need a secure context (https,
// or localhost), which is why a phone on a local preview needs the https
// server (docs/design/trail-content.md, Building and checking).

import type { LngLat } from "./trail-types.ts";
import { bearing, distance, norm, turn } from "./geo.ts";

export interface Fix {
  at: LngLat;
  /** Metres, the radius the browser is 68 % sure of. */
  accuracy: number;
  time: number;
}

export interface Heading {
  /** Degrees clockwise from north: where the top of the screen points (the compass), or the walk (the course). */
  deg: number;
  source: "compass" | "course";
  /** Half the angle of uncertainty, degrees: the cone's width. */
  spread: number;
}

export type HereState = "off" | "asking" | "on" | "denied" | "unavailable" | "insecure";
/** What changed: a new fix, the heading, the state, or the fix went stale. */
export type HereChange = "fix" | "heading" | "state" | "stale";

/** Course from the GPS while the visitor walks at least this fast (m/s). */
const MOVING = 0.6;
/** Faster than this between two fixes (m/s) is a jump of the fix, not walking. */
const WALK_MAX = 4;
/** A course is believed this long after the movement that gave it (ms). */
const COURSE_LIFE = 8000;
/** Half the cone for a course: a direction between fixes is rougher than a compass. */
const COURSE_SPREAD = 32;
/** The compass is live while its events keep coming within this (ms). */
const COMPASS_LIFE = 1500;
/**
 * A fix this old (ms) says nothing about where the visitor stands: a walker
 * has gone some 40 m by then, as far as "at a station" lasts (guide.ts LEAVE).
 */
const FIX_LIFE = 30000;

type IOSOrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
type IOSOrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export class Here {
  state: HereState = "off";
  fix?: Fix;
  private listeners: ((what: HereChange) => void)[] = [];
  private watch?: number;
  private staleTimer = 0;
  /** `sure`: the sensor gives an estimate of its error (iOS says when it has none). */
  private compass?: { deg: number; spread: number; sure: boolean; time: number; x: number; y: number };
  private course?: { deg: number; time: number };
  private courseAnchor?: Fix;
  private orientationOn = false;
  private asked = false;
  /** An error was reported since start, so a timeout repeating isn't news. */
  private reported = false;

  onChange(fn: (what: HereChange) => void) {
    this.listeners.push(fn);
  }
  private emit(what: HereChange) {
    for (const fn of this.listeners) fn(what);
  }
  private setState(s: HereState) {
    if (s === this.state) return;
    this.state = s;
    this.emit("state");
  }

  /**
   * The best heading now: the compass while it reports, else the course while
   * walking, else none. A compass without an estimate of its error gives way
   * to the course while there is one: walking tells the direction better than
   * an uncalibrated sensor.
   */
  get heading(): Heading | undefined {
    const now = performance.now();
    const c = this.compass && now - this.compass.time < COMPASS_LIFE ? this.compass : undefined;
    const k = this.course && now - this.course.time < COURSE_LIFE ? this.course : undefined;
    if (c && (c.sure || !k)) return { deg: c.deg, source: "compass", spread: c.spread };
    if (k) return { deg: k.deg, source: "course", spread: COURSE_SPREAD };
    return undefined;
  }

  /** The fix is too old to say where the visitor stands (FIX_LIFE); "stale" is emitted when it becomes so. */
  get stale(): boolean {
    return this.fix !== undefined && performance.now() - this.fix.time >= FIX_LIFE;
  }

  get active(): boolean {
    return this.watch !== undefined;
  }

  /** The compass may wait for a permission asked from a tap (iOS), not asked yet in this page. */
  get compassNeedsGesture(): boolean {
    const C = globalThis.DeviceOrientationEvent as IOSOrientationCtor | undefined;
    return typeof C?.requestPermission === "function" && !this.compass && !this.asked;
  }

  /** Whether the browser has already granted location to this site, so starting asks nothing. */
  static async granted(): Promise<boolean> {
    try {
      return (await navigator.permissions.query({ name: "geolocation" })).state === "granted";
    } catch {
      return false;
    }
  }

  /**
   * Starts GPS and the compass. `gesture`: called from a tap, so iOS may be
   * asked for the compass. That request comes first, before anything
   * asynchronous, or iOS no longer counts it as the tap's.
   */
  start(gesture: boolean) {
    if (gesture) this.askCompass();
    if (this.watch !== undefined) return;
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      this.setState("insecure");
      return;
    }
    this.reported = false;
    this.listenOrientation();
    this.setState("asking");
    this.watch = navigator.geolocation.watchPosition(
      (p) => this.onFix(p),
      (e) => this.onError(e),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 30000 },
    );
  }

  private onFix(p: GeolocationPosition) {
    const fix: Fix = { at: [p.coords.longitude, p.coords.latitude], accuracy: p.coords.accuracy, time: performance.now() };
    this.updateCourse(fix, p.coords.heading, p.coords.speed);
    this.fix = fix;
    // A little after FIX_LIFE, so `stale` reads true when it fires. A timer held
    // back in a hidden tab fires on its return, which is when the stale fix would show.
    clearTimeout(this.staleTimer);
    this.staleTimer = window.setTimeout(() => this.emit("stale"), FIX_LIFE + 100);
    this.setState("on");
    this.emit("fix");
  }

  private onError(e: GeolocationPositionError) {
    if (e.code === e.PERMISSION_DENIED) {
      if (this.watch !== undefined) navigator.geolocation.clearWatch(this.watch);
      this.watch = undefined;
      this.setState("denied");
      return;
    }
    // No signal or a timeout: the watch goes on and may still get a fix.
    if (this.fix || this.reported) return;
    this.reported = true;
    this.setState("unavailable");
  }

  /**
   * The GPS course: the browser's own heading while moving, else the
   * direction between fixes far enough apart for their error not to decide it.
   */
  private updateCourse(fix: Fix, heading: number | null, speed: number | null) {
    if (heading != null && Number.isFinite(heading) && speed != null && speed >= MOVING) {
      this.setCourse(heading, fix.time);
      this.courseAnchor = fix;
      return;
    }
    const a = this.courseAnchor;
    if (!a || fix.time - a.time > 30000 || fix.accuracy > 40) {
      this.courseAnchor = fix;
      return;
    }
    const d = distance(a.at, fix.at);
    if (d >= Math.max(10, 1.5 * Math.max(a.accuracy, fix.accuracy))) {
      // At walking pace only: a jump (a first good fix after a poor one) is no direction.
      const speed = d / Math.max(0.001, (fix.time - a.time) / 1000);
      if (speed <= WALK_MAX) this.setCourse(bearing(a.at, fix.at), fix.time);
      this.courseAnchor = fix;
    }
  }
  private setCourse(deg: number, time: number) {
    this.course = { deg: norm(deg), time };
    this.emit("heading");
  }

  /**
   * iOS sends orientation only once asked from a tap; recent Chromium has the
   * same request but answers it without a prompt. Listening goes on either
   * way: where nothing is granted, nothing arrives.
   */
  private askCompass() {
    const C = globalThis.DeviceOrientationEvent as IOSOrientationCtor | undefined;
    if (typeof C?.requestPermission !== "function" || this.compass || this.asked) return;
    this.asked = true;
    C.requestPermission()
      .then((r) => {
        if (r === "granted") this.listenOrientation();
      })
      .catch(() => {
        /* refused, or not counted as the tap's: the course stands in */
      });
  }

  private listenOrientation() {
    if (this.orientationOn || !globalThis.DeviceOrientationEvent) return;
    this.orientationOn = true;
    if ("ondeviceorientationabsolute" in window) {
      addEventListener("deviceorientationabsolute", (e) => this.onOrientation(e as DeviceOrientationEvent, true));
    } else {
      addEventListener("deviceorientation", (e) => this.onOrientation(e, e.absolute));
    }
  }

  private onOrientation(e: IOSOrientationEvent, absolute: boolean) {
    const screenAngle = Number(screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0) || 0;
    let deg: number | undefined;
    let spread = 20;
    let sure = true;
    if (e.webkitCompassHeading != null && Number.isFinite(e.webkitCompassHeading)) {
      // iOS: degrees from north of the device's top. A negative accuracy is no
      // estimate (uncalibrated, or interference): the widest cone, and the course wins while walking.
      const acc = e.webkitCompassAccuracy ?? 20;
      sure = acc >= 0;
      deg = e.webkitCompassHeading + screenAngle;
      spread = sure ? Math.max(15, Math.min(50, acc)) : 50;
    } else if (absolute && e.alpha != null && e.beta != null && e.gamma != null) {
      deg = forwardHeading(e.alpha, e.beta, e.gamma, screenAngle);
    }
    if (deg === undefined) return;

    // A light low-pass on the unit vector: the sensor jitters by a few degrees.
    const now = performance.now();
    const x = Math.sin(deg * (Math.PI / 180)), y = Math.cos(deg * (Math.PI / 180));
    const c = this.compass;
    if (!c || now - c.time > 500 || Math.abs(turn(c.deg, deg)) > 90) {
      this.compass = { deg: norm(deg), spread, sure, time: now, x, y };
    } else {
      const k = 1 - Math.exp(-(now - c.time) / 120);
      const sx = c.x + k * (x - c.x), sy = c.y + k * (y - c.y);
      this.compass = { deg: norm(Math.atan2(sx, sy) * (180 / Math.PI)), spread, sure, time: now, x: sx, y: sy };
    }
    this.emit("heading");
  }
}

/**
 * Which way the visitor faces, from absolute device orientation (W3C
 * alpha/beta/gamma, Z-X'-Y''). Held flat, that is where the top of the screen
 * points; raised upright (portrait or landscape), where the back camera looks.
 * The two are blended by how far the screen's normal is from vertical, so
 * neither degenerates: the top's direction is undefined held upright, the
 * camera's held flat. Exported for its tests.
 */
export function forwardHeading(alpha: number, beta: number, gamma: number, screenAngle: number): number | undefined {
  const r = Math.PI / 180;
  const sa = Math.sin(alpha * r), ca = Math.cos(alpha * r);
  const sb = Math.sin(beta * r), cb = Math.cos(beta * r);
  const sg = Math.sin(gamma * r), cg = Math.cos(gamma * r);
  // Device axes in the earth frame, horizontal parts only: [east, north].
  const yE = -sa * cb, yN = ca * cb;
  const xE = ca * cg - sa * sb * sg, xN = sa * cg + ca * sb * sg;
  const zE = -ca * sg - sa * sb * cg, zN = -sa * sg + ca * sb * cg; // the back camera (−z)
  // The screen's up: the device's top, turned with the screen's rotation.
  const st = Math.sin(screenAngle * r), ct = Math.cos(screenAngle * r);
  const uE = ct * yE + st * xE, uN = ct * yN + st * xN;
  const w = 1 - (cb * cg) ** 2; // the screen normal's up component is cb·cg: flat 1, upright 0
  const E = uE + w * zE, N = uN + w * zN;
  if (Math.hypot(E, N) < 0.1) return undefined;
  return norm(Math.atan2(E, N) / r);
}
