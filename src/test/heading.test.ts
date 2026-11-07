// Which way the visitor faces, from device orientation (here.ts
// forwardHeading), in the poses a walker holds a phone in. W3C
// alpha/beta/gamma and the screen's rotation; a heading is degrees clockwise
// from north. Run by `npm test` (node --test).

import { test } from "node:test";
import assert from "node:assert/strict";
import { forwardHeading } from "../app/here.ts";

// name, alpha, beta, gamma, screen angle, the heading expected
const poses: [string, number, number, number, number, number][] = [
  ["flat, top north", 0, 0, 0, 0, 0],
  ["flat, top east", 270, 0, 0, 0, 90],
  ["flat, turned to landscape, the screen's top north", 90, 0, 0, 90, 0],
  ["upright portrait, camera north", 0, 90, 0, 0, 0],
  ["upright portrait, camera east", 270, 90, 0, 0, 90],
  ["half raised, camera north", 0, 45, 0, 0, 0],
  ["upright landscape, camera north", 270, 0, 90, 90, 0],
  ["upright landscape the other way round, camera north", 90, 0, -90, 270, 0],
];

for (const [name, alpha, beta, gamma, screen, want] of poses) {
  test(name, () => {
    const got = forwardHeading(alpha, beta, gamma, screen);
    assert.notEqual(got, undefined, "no heading");
    const apart = Math.abs(((((got! - want) % 360) + 540) % 360) - 180);
    assert.ok(apart < 0.5, `got ${got}, want ${want}`);
  });
}
