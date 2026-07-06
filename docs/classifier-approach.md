# Handshape Classifier — Approach and Progress

## Why we are moving beyond geometric rules

V0 recognised handshapes with hand-written geometric rules in
[`src/gesture-rules.mjs`](../src/gesture-rules.mjs). That works for a handful of
visually distinct letters (A, B, C, F, I, L, Y) but does not scale:

- Letters like `M, N, S, T, A, E` are near-identical fists that differ only by
  subtle thumb placement — hard to separate with thresholds.
- Rules keyed on the image `y` axis break when the hand is tilted.
- Every new letter risks breaking the thresholds of previous ones (see the
  "Tighten A handshape thumb rule" commit for an early sign of this).

Instead we classify the 21 MediaPipe hand landmarks directly. Each landmark has
`x, y, z`, giving a 63-number vector per hand. A small nearest-neighbour model
over these vectors separates all 26 static letters far better than thresholds,
runs entirely in the browser, and needs no server.

The geometric rules are **not** discarded: they stay on as a source of coaching
hints ("straighten your pinky"), while the classifier delivers the match verdict.

## Pipeline

```
raw MediaPipe landmarks
        │
        ▼
landmark-normalization.mjs   ← pose-invariant 63-number feature vector
        │
        ▼
knn-classifier.mjs           ← nearest-neighbour vote over recorded samples
        │
        ▼
verdict + gesture-rules hint → UI
```

## Step 1 — Landmark normalization (done)

Module: [`src/landmark-normalization.mjs`](../src/landmark-normalization.mjs)
Tests: [`tests/landmark-normalization.test.mjs`](../tests/landmark-normalization.test.mjs)

A raw landmark set depends on where the hand is, how far it is from the camera,
and how it is tilted. None of that should change the predicted letter, so we
strip it out before classification. Applied in order:

1. **Translation** — move the wrist to the origin.
2. **Scale** — divide by hand size (`max(wrist→middle-MCP, index-MCP→pinky-MCP)`),
   so camera distance stops mattering.
3. **In-plane rotation** — rotate so the wrist→middle-MCP direction points
   straight up, so hand tilt stops mattering. The rotation solves
   `R · reference = (0, -L)`, giving `cos = -ref.y / L`, `sin = -ref.x / L`.
4. **Mirroring (optional)** — flip left hands (`handedness === "Left"`) across the
   x axis so a single recorded dataset covers both hands.

The `z` (depth) coordinate is kept and scaled with the same factor, because
relative depth separates shapes that look identical in 2D.

Public API:

- `normalizeLandmarks(landmarks, { mirror })` → normalized `{x, y, z}[]` or `null`.
- `toFeatureVector(normalized)` → 63-number array or `null`.
- `landmarksToFeatureVector(landmarks, { handedness })` → one-step raw → vector.

Invalid input (fewer than 21 points, or any non-finite coordinate) returns
`null` so callers never feed garbage into the classifier.

The tests assert the invariances hold to within `1e-6`: a synthetic hand is
translated, scaled, rotated, and mirrored, and the feature vector is unchanged
(or cleanly mirrored) each time.

## Step 2 — KNN classifier (done)

Module: [`src/knn-classifier.mjs`](../src/knn-classifier.mjs)
Tests: [`tests/knn-classifier.test.mjs`](../tests/knn-classifier.test.mjs)

`createKnnClassifier({ k })` stores labelled 63-number feature vectors and
classifies a new vector by a **distance-weighted vote** of its `k` nearest
neighbours (inverse-distance weighting, so closer samples count for more and an
exact match cannot divide by zero). `k` is capped at the number of stored
samples so the model works from the very first recording.

`classify()` returns `{ label, confidence, distance, neighbors }`, where
`confidence` is the share of the weighted vote won by the top label (in `[0, 1]`)
— the render loop can threshold on this to avoid guessing on an unclear pose.

Why KNN: no training step, a user's own reference sample takes effect
immediately, and the entire model is just an array of vectors that serialises
cleanly. Persistence helpers:

- `toJSON()` / `loadJSON(json)` — pure (de)serialisation, corrupt input is
  rejected without throwing and without touching existing samples.
- `save(storage)` / `load(storage)` — localStorage wrappers (default to
  `globalThis.localStorage`, injectable for tests), storing under
  `signcoach.knn.samples.v1`.

Management helpers `count(label?)`, `labels()`, `removeLabel(label)`, and
`clear()` back the recording UI in the next step.

## Next steps

- **Step 3** — recording UI: "record reference for letter X", capture N frames.
- **Step 4** — wire the classifier into the render loop; classifier gives the
  verdict, `gesture-rules.mjs` supplies the corrective hint.
- **Step 5** — record a default dataset for all 26 letters and ship it as the
  built-in baseline.
