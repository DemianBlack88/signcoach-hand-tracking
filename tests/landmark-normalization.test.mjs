import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLandmarks,
  toFeatureVector,
  landmarksToFeatureVector
} from "../src/landmark-normalization.mjs";

// A deterministic 21-point hand pointing straight up, palm facing the camera.
// Values are arbitrary but geometrically consistent (wrist at origin, fingers
// spreading upward). Only the relations between points matter for these tests.
function makeUprightHand() {
  const points = [
    [0.5, 0.9, 0.0], // 0 wrist
    [0.45, 0.82, 0.0], // 1 thumb cmc
    [0.42, 0.76, 0.0], // 2 thumb mcp
    [0.4, 0.71, 0.0], // 3 thumb ip
    [0.38, 0.67, 0.0], // 4 thumb tip
    [0.52, 0.68, 0.0], // 5 index mcp
    [0.52, 0.58, 0.0], // 6 index pip
    [0.52, 0.51, 0.0], // 7 index dip
    [0.52, 0.45, 0.0], // 8 index tip
    [0.56, 0.68, 0.0], // 9 middle mcp
    [0.56, 0.57, 0.0], // 10 middle pip
    [0.56, 0.49, 0.0], // 11 middle dip
    [0.56, 0.42, 0.0], // 12 middle tip
    [0.6, 0.69, 0.0], // 13 ring mcp
    [0.6, 0.59, 0.0], // 14 ring pip
    [0.6, 0.52, 0.0], // 15 ring dip
    [0.6, 0.46, 0.0], // 16 ring tip
    [0.64, 0.71, 0.0], // 17 pinky mcp
    [0.64, 0.63, 0.0], // 18 pinky pip
    [0.64, 0.57, 0.0], // 19 pinky dip
    [0.64, 0.52, 0.0] // 20 pinky tip
  ];
  return points.map(([x, y, z]) => ({ x, y, z }));
}

// Rotates a hand around the wrist by the given angle in the image plane and
// applies a uniform scale + translation. Simulates the same handshape held at a
// different angle, distance, and screen position.
function transformHand(landmarks, { angle = 0, scale = 1, dx = 0, dy = 0 } = {}) {
  const wrist = landmarks[0];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return landmarks.map((point) => {
    const x = (point.x - wrist.x) * scale;
    const y = (point.y - wrist.y) * scale;
    return {
      x: x * cos - y * sin + wrist.x + dx,
      y: x * sin + y * cos + wrist.y + dy,
      z: point.z
    };
  });
}

function maxAbsDiff(a, b) {
  let max = 0;
  for (let i = 0; i < a.length; i += 1) {
    max = Math.max(max, Math.abs(a[i] - b[i]));
  }
  return max;
}

test("rejects hands with too few landmarks", () => {
  assert.equal(normalizeLandmarks([{ x: 0, y: 0, z: 0 }]), null);
  assert.equal(toFeatureVector([{ x: 0, y: 0, z: 0 }]), null);
  assert.equal(landmarksToFeatureVector([{ x: 0, y: 0, z: 0 }]), null);
});

test("rejects hands with non-finite coordinates", () => {
  const broken = makeUprightHand();
  broken[8] = { x: Number.NaN, y: 0.4, z: 0 };
  assert.equal(normalizeLandmarks(broken), null);
});

test("moves the wrist to the origin", () => {
  const normalized = normalizeLandmarks(makeUprightHand());
  assert.ok(Math.abs(normalized[0].x) < 1e-9);
  assert.ok(Math.abs(normalized[0].y) < 1e-9);
});

test("produces a 63-number feature vector", () => {
  const vector = toFeatureVector(normalizeLandmarks(makeUprightHand()));
  assert.equal(vector.length, 63);
  assert.ok(vector.every((value) => Number.isFinite(value)));
});

test("is invariant to translation", () => {
  const base = landmarksToFeatureVector(makeUprightHand());
  const moved = landmarksToFeatureVector(transformHand(makeUprightHand(), { dx: 0.2, dy: -0.15 }));
  assert.ok(maxAbsDiff(base, moved) < 1e-6);
});

test("is invariant to scale (camera distance)", () => {
  const base = landmarksToFeatureVector(makeUprightHand());
  const closer = landmarksToFeatureVector(transformHand(makeUprightHand(), { scale: 1.8 }));
  assert.ok(maxAbsDiff(base, closer) < 1e-6);
});

test("is invariant to in-plane rotation (hand tilt)", () => {
  const base = landmarksToFeatureVector(makeUprightHand());
  const tilted = landmarksToFeatureVector(transformHand(makeUprightHand(), { angle: Math.PI / 5 }));
  assert.ok(maxAbsDiff(base, tilted) < 1e-6);
});

test("mirrors a left hand onto the right-hand reference frame", () => {
  const rightVector = landmarksToFeatureVector(makeUprightHand(), { handedness: "Right" });
  const leftVector = landmarksToFeatureVector(makeUprightHand(), { handedness: "Left" });
  // Same raw hand, opposite handedness label: x coordinates flip, y stays put.
  for (let i = 0; i < rightVector.length; i += 3) {
    assert.ok(Math.abs(rightVector[i] + leftVector[i]) < 1e-6, `x[${i}] should be mirrored`);
    assert.ok(Math.abs(rightVector[i + 1] - leftVector[i + 1]) < 1e-6, `y[${i}] should match`);
  }
});
