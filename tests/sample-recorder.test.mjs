import test from "node:test";
import assert from "node:assert/strict";
import { createSampleRecorder } from "../src/sample-recorder.mjs";
import { createKnnClassifier } from "../src/knn-classifier.mjs";
import { landmarksToFeatureVector } from "../src/landmark-normalization.mjs";

// A minimal but geometrically valid 21-point hand; the exact pose is irrelevant
// here since we only check counting/session behaviour, not classification.
function makeHand() {
  const points = [];
  for (let i = 0; i < 21; i += 1) {
    points.push({ x: 0.5 + i * 0.01, y: 0.9 - i * 0.02, z: 0 });
  }
  return points;
}

test("captures the requested number of frames then finishes", () => {
  const knn = createKnnClassifier();
  const recorder = createSampleRecorder(knn, { framesPerSample: 3 });

  assert.equal(recorder.recording, false);
  assert.equal(recorder.start("A"), true);
  assert.equal(recorder.recording, true);

  const first = recorder.capture(makeHand());
  assert.equal(first.captured, 1);
  assert.equal(first.done, false);

  recorder.capture(makeHand());
  const last = recorder.capture(makeHand());
  assert.equal(last.done, true);
  assert.equal(last.captured, 3);
  assert.equal(last.label, "A");
  assert.equal(recorder.recording, false);
  assert.equal(knn.count("A"), 3);
});

test("ignores frames without a usable hand", () => {
  const knn = createKnnClassifier();
  const recorder = createSampleRecorder(knn, { framesPerSample: 2 });
  recorder.start("B");

  const empty = recorder.capture(null);
  assert.equal(empty.captured, 0);
  assert.equal(empty.added, false);
  assert.equal(knn.count("B"), 0);

  const short = recorder.capture([{ x: 0, y: 0, z: 0 }]); // too few points
  assert.equal(short.captured, 0);

  recorder.capture(makeHand());
  const done = recorder.capture(makeHand());
  assert.equal(done.done, true);
  assert.equal(knn.count("B"), 2);
});

test("reports progress between 0 and 1", () => {
  const knn = createKnnClassifier();
  const recorder = createSampleRecorder(knn, { framesPerSample: 4 });
  recorder.start("L");
  assert.equal(recorder.capture(makeHand()).progress, 0.25);
  assert.equal(recorder.capture(makeHand()).progress, 0.5);
});

test("capture outside a session is a no-op", () => {
  const knn = createKnnClassifier();
  const recorder = createSampleRecorder(knn, { framesPerSample: 3 });
  const idle = recorder.capture(makeHand());
  assert.equal(idle.recording, false);
  assert.equal(idle.captured, 0);
  assert.equal(knn.count(), 0);
});

test("rejects an empty label and can be cancelled", () => {
  const knn = createKnnClassifier();
  const recorder = createSampleRecorder(knn, { framesPerSample: 3 });
  assert.equal(recorder.start(""), false);
  assert.equal(recorder.recording, false);

  recorder.start("Y");
  recorder.capture(makeHand());
  recorder.cancel();
  assert.equal(recorder.recording, false);
  // The one frame captured before cancelling stays in the classifier.
  assert.equal(knn.count("Y"), 1);
});

test("recorded samples become classifiable", () => {
  const knn = createKnnClassifier({ k: 1 });
  const recorder = createSampleRecorder(knn, { framesPerSample: 3 });
  recorder.start("A");
  recorder.capture(makeHand());
  recorder.capture(makeHand());
  recorder.capture(makeHand());

  const result = knn.classify(landmarksToFeatureVector(makeHand()));
  assert.equal(result.label, "A");
});
