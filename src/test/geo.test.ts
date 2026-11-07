// The leg geometry walking help leans on (geo.ts onLine): where a walker is
// along a line, and that a line passing close to itself keeps them on their
// fold. Run by `npm test` (node --test).

import { test } from "node:test";
import assert from "node:assert/strict";
import { onLine, toLocal } from "../app/geo.ts";
import type { LngLat } from "../app/trail-types.ts";

const O: LngLat = [8.3, 47.47];
/** The point x metres east and y metres north of O. */
function at(x: number, y: number): LngLat {
  return [O[0] + x / (111_132 * Math.cos((O[1] * Math.PI) / 180)), O[1] + y / 111_132];
}
const near = (a: number, b: number, tol = 0.1) => assert.ok(Math.abs(a - b) < tol, `${a} is not within ${tol} of ${b}`);

// A switchback: 50 m east, then back west 3 m further north (along 0–50, 50–53, 53–103).
const fold: LngLat[] = [at(0, 0), at(50, 0), at(50, 3), at(0, 3)];

test("toLocal reads the test grid back", () => {
  const [x, y] = toLocal(O, at(30, -20));
  near(x, 30);
  near(y, -20);
});

test("onLine without a history takes the nearest fold", () => {
  const o = onLine(at(25, 1), fold, 30)!;
  near(o.along, 25);
  near(o.off, 1);
  near(o.length, 103);
});

test("onLine keeps the fold the walker was on against a slightly nearer one", () => {
  // On the way back (along 78 above x = 25), a fix 1 m nearer the outward fold.
  const o = onLine(at(25, 1), fold, 30, 75)!;
  near(o.along, 78);
  near(o.off, 2);
});

test("onLine lets a real move along the line win over the history", () => {
  const o = onLine(at(40, 0), fold, 30, 10)!;
  near(o.along, 40);
  near(o.off, 0);
});

test("onLine's point ahead stops at the line's end", () => {
  const o = onLine(at(10, 3), fold, 30, 90)!; // along 93; 30 m ahead passes the end at 103
  const [x, y] = toLocal(O, o.ahead);
  near(x, 0);
  near(y, 3);
});
