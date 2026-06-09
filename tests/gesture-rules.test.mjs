import test from "node:test";
import assert from "node:assert/strict";
import { evaluateHandshape, isFingerExtended, isFingerFolded } from "../src/gesture-rules.mjs";

test("detects an extended index finger from mock landmarks", () => {
  const landmarks = makeHand({ index: "extended" });
  assert.equal(isFingerExtended(landmarks, "index"), true);
});

test("detects a folded finger from mock landmarks", () => {
  const landmarks = makeHand({ index: "folded" });
  assert.equal(isFingerFolded(landmarks, "index"), true);
});

test("A rule scores a fist-like mock higher than an open hand mock", () => {
  const fist = makeHand({
    index: "folded",
    middle: "folded",
    ring: "folded",
    pinky: "folded",
    thumb: "closed"
  });
  const openHand = makeHand({
    index: "extended",
    middle: "extended",
    ring: "extended",
    pinky: "extended",
    thumb: "open"
  });

  assert.ok(evaluateHandshape("A", fist).score > evaluateHandshape("A", openHand).score);
});

test("A rule scores a side thumb higher than a raised thumb", () => {
  const sideThumb = makeHand({
    index: "folded",
    middle: "folded",
    ring: "folded",
    pinky: "folded",
    thumb: "closed"
  });
  const raisedThumb = makeHand({
    index: "folded",
    middle: "folded",
    ring: "folded",
    pinky: "folded",
    thumb: "raised"
  });

  assert.ok(evaluateHandshape("A", sideThumb).score > evaluateHandshape("A", raisedThumb).score);
  assert.equal(evaluateHandshape("A", raisedThumb).feedback, "Keep the thumb on the side, not up");
});

test("L rule scores thumb and index extended higher than a fist mock", () => {
  const lShape = makeHand({
    index: "extended",
    middle: "folded",
    ring: "folded",
    pinky: "folded",
    thumb: "open"
  });
  const fist = makeHand({
    index: "folded",
    middle: "folded",
    ring: "folded",
    pinky: "folded",
    thumb: "closed"
  });

  assert.ok(evaluateHandshape("L", lShape).score > evaluateHandshape("L", fist).score);
});

test("missing landmarks return a safe result", () => {
  const result = evaluateHandshape("A", null);
  assert.equal(result.score, 0);
  assert.equal(result.feedback, "Hand not detected");
});

function makeHand(overrides = {}) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));

  landmarks[0] = { x: 0.5, y: 0.82, z: 0 };
  landmarks[5] = { x: 0.44, y: 0.6, z: 0 };
  landmarks[9] = { x: 0.51, y: 0.56, z: 0 };
  landmarks[13] = { x: 0.58, y: 0.59, z: 0 };
  landmarks[17] = { x: 0.68, y: 0.62, z: 0 };

  setFinger(landmarks, "index", overrides.index || "folded", 5, 6, 7, 8, 0.44);
  setFinger(landmarks, "middle", overrides.middle || "folded", 9, 10, 11, 12, 0.51);
  setFinger(landmarks, "ring", overrides.ring || "folded", 13, 14, 15, 16, 0.58);
  setFinger(landmarks, "pinky", overrides.pinky || "folded", 17, 18, 19, 20, 0.66);
  setThumb(landmarks, overrides.thumb || "closed");

  return landmarks;
}

function setFinger(landmarks, _name, state, mcp, pip, dip, tip, x) {
  landmarks[mcp] = landmarks[mcp] || { x, y: 0.6, z: 0 };

  if (state === "extended") {
    landmarks[pip] = { x, y: 0.44, z: 0 };
    landmarks[dip] = { x, y: 0.32, z: 0 };
    landmarks[tip] = { x, y: 0.2, z: 0 };
    return;
  }

  landmarks[pip] = { x, y: 0.54, z: 0 };
  landmarks[dip] = { x: x + 0.01, y: 0.62, z: 0 };
  landmarks[tip] = { x: x + 0.01, y: 0.68, z: 0 };
}

function setThumb(landmarks, state) {
  landmarks[1] = { x: 0.4, y: 0.68, z: 0 };
  landmarks[2] = { x: 0.36, y: 0.62, z: 0 };
  landmarks[3] = { x: 0.34, y: 0.58, z: 0 };
  if (state === "raised") {
    landmarks[4] = { x: 0.38, y: 0.42, z: 0 };
    return;
  }

  landmarks[4] = state === "open" ? { x: 0.24, y: 0.6, z: 0 } : { x: 0.39, y: 0.58, z: 0 };
}
