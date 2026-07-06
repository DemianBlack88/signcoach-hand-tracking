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

## Step 3 — recording UI (done)

Module: [`src/sample-recorder.mjs`](../src/sample-recorder.mjs)
Tests: [`tests/sample-recorder.test.mjs`](../tests/sample-recorder.test.mjs)
Wiring: [`src/app.mjs`](../src/app.mjs), [`index.html`](../index.html), [`src/styles.css`](../src/styles.css)

`createSampleRecorder(classifier, { framesPerSample })` runs a "record N frames
for a letter" session. The render loop feeds it one frame of landmarks at a
time; each usable frame becomes one labelled sample (frames with no hand are
ignored, so the count reflects real captured examples). When the last needed
frame lands the session ends and returns `done: true`. It holds no DOM or camera
state, so it is unit-tested in isolation.

The "Train model" panel in the practice controls exposes this:

- **Record X** — starts a capture session for the selected letter; the button
  turns red and the status shows `Recording X… 12/30`. Clicking again cancels.
- **Clear X** — drops that letter's samples (disabled when there are none).
- **Recognized: X (87%)** — while not recording, the loop classifies the live
  hand and shows the top label + confidence, so you can immediately see the
  model working on your own hand.
- Samples persist to `localStorage` after each recording, so a trained model
  survives a refresh.

This is the first step that needs a real camera, so it is verified on a phone
via the GitHub Pages deployment rather than by unit tests alone.

## Step 4 — classifier drives the score (done)

Classifier method: `matchScore` in [`src/knn-classifier.mjs`](../src/knn-classifier.mjs)
Wiring: [`src/app.mjs`](../src/app.mjs) (`updateDetectedState`)
Tests: [`tests/knn-classifier.test.mjs`](../tests/knn-classifier.test.mjs)

The render loop now lets the trained model decide the practice score while the
geometric rules stay on only as the corrective hint text ("Raise your pinky").

`matchScore(vector, label)` is a scale-free similarity in `[0, 1]`:

```
score = dOther / (dTarget + dOther)
```

where `dTarget` is the distance to the nearest recorded example of the target
letter and `dOther` the distance to the nearest example of any other letter. An
exact match scores ~1, an equally-close other letter 0.5, and a hand that looks
more like another letter below 0.5 — with no distance threshold to calibrate.
With a single trained label it falls back to `1 / (1 + dTarget)`.

`updateDetectedState` uses the model score when the target letter has samples
**and** at least two letters are trained (so `dOther` is meaningful); otherwise
it falls back entirely to the rule-based score, preserving the original
behaviour for untrained letters. The score flows through the existing
`feedbackState` smoothing/hold logic unchanged, and the detection line shows
which engine is active (`Right hand · your model` vs `· rules`).

## Next steps

- **Step 5** — record a default dataset for all 26 letters and ship it as the
  built-in baseline.
