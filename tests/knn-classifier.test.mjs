import test from "node:test";
import assert from "node:assert/strict";
import { createKnnClassifier, STORAGE_KEY } from "../src/knn-classifier.mjs";

const FEATURE_LENGTH = 63;

// Builds a valid 63-number vector filled with `base`, then nudges the first few
// entries so different labels occupy different regions of feature space.
function vectorNear(base, jitter = 0) {
  const vector = new Array(FEATURE_LENGTH).fill(base);
  vector[0] += jitter;
  vector[1] -= jitter;
  return vector;
}

function trainedClassifier() {
  const knn = createKnnClassifier({ k: 3 });
  for (let i = 0; i < 4; i += 1) {
    knn.addSample("A", vectorNear(0, i * 0.001));
    knn.addSample("B", vectorNear(1, i * 0.001));
    knn.addSample("L", vectorNear(-1, i * 0.001));
  }
  return knn;
}

// Minimal in-memory stand-in for the browser localStorage API.
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key)
  };
}

test("empty classifier returns null", () => {
  const knn = createKnnClassifier();
  assert.equal(knn.classify(vectorNear(0)), null);
});

test("rejects malformed samples and vectors", () => {
  const knn = createKnnClassifier();
  assert.equal(knn.addSample("A", [1, 2, 3]), false); // wrong length
  assert.equal(knn.addSample("", vectorNear(0)), false); // empty label
  assert.equal(knn.addSample("A", vectorNear(Number.NaN)), false); // non-finite
  assert.equal(knn.count(), 0);
  assert.equal(knn.classify([1, 2, 3]), null);
});

test("classifies a vector to its nearest cluster", () => {
  const knn = trainedClassifier();
  assert.equal(knn.classify(vectorNear(0, 0.0005)).label, "A");
  assert.equal(knn.classify(vectorNear(1, -0.0005)).label, "B");
  assert.equal(knn.classify(vectorNear(-1, 0.0005)).label, "L");
});

test("confidence is high for an unambiguous match", () => {
  const knn = trainedClassifier();
  const result = knn.classify(vectorNear(1));
  assert.equal(result.label, "B");
  assert.ok(result.confidence > 0.9, `expected high confidence, got ${result.confidence}`);
});

test("k is capped at the sample count", () => {
  const knn = createKnnClassifier({ k: 10 });
  knn.addSample("A", vectorNear(0));
  knn.addSample("B", vectorNear(1));
  const result = knn.classify(vectorNear(0));
  assert.equal(result.label, "A");
  assert.equal(result.neighbors.length, 2);
});

test("counts and lists labels", () => {
  const knn = trainedClassifier();
  assert.equal(knn.count(), 12);
  assert.equal(knn.count("A"), 4);
  assert.deepEqual(knn.labels(), ["A", "B", "L"]);
});

test("removes and clears samples", () => {
  const knn = trainedClassifier();
  assert.equal(knn.removeLabel("A"), 4);
  assert.equal(knn.count("A"), 0);
  assert.deepEqual(knn.labels(), ["B", "L"]);
  knn.clear();
  assert.equal(knn.count(), 0);
});

test("round-trips through JSON", () => {
  const knn = trainedClassifier();
  const json = knn.toJSON();
  const restored = createKnnClassifier({ k: 3 });
  assert.equal(restored.loadJSON(json), true);
  assert.equal(restored.count(), 12);
  assert.equal(restored.classify(vectorNear(1)).label, "B");
});

test("loadJSON rejects corrupt data without throwing", () => {
  const knn = trainedClassifier();
  assert.equal(knn.loadJSON("not json"), false);
  assert.equal(knn.loadJSON(JSON.stringify({ version: 1 })), false);
  assert.equal(knn.count(), 12, "samples should be untouched after a failed load");
});

test("matchScore returns 0 without samples or with a bad vector", () => {
  const knn = createKnnClassifier();
  assert.equal(knn.matchScore(vectorNear(0), "A"), 0);
  knn.addSample("A", vectorNear(0));
  assert.equal(knn.matchScore([1, 2, 3], "A"), 0); // malformed vector
  assert.equal(knn.matchScore(vectorNear(0), "Z"), 0); // label has no samples
});

test("matchScore scores an exact target match near 1", () => {
  const knn = trainedClassifier();
  const score = knn.matchScore(vectorNear(0), "A");
  assert.ok(score > 0.95, `expected near 1, got ${score}`);
});

test("matchScore scores a wrong-letter pose below 0.5", () => {
  const knn = trainedClassifier();
  // A hand sitting right on a B cluster should score low for target A.
  const score = knn.matchScore(vectorNear(1), "A");
  assert.ok(score < 0.5, `expected below 0.5, got ${score}`);
});

test("matchScore is ~0.5 when target and another letter are equally close", () => {
  const knn = createKnnClassifier();
  knn.addSample("A", vectorNear(0));
  knn.addSample("B", vectorNear(2));
  const score = knn.matchScore(vectorNear(1), "A"); // midway between A and B
  assert.ok(score > 0.45 && score < 0.55, `expected ~0.5, got ${score}`);
});

test("matchScore falls back to distance similarity for a single label", () => {
  const knn = createKnnClassifier();
  knn.addSample("A", vectorNear(0));
  const close = knn.matchScore(vectorNear(0, 0.01), "A");
  const far = knn.matchScore(vectorNear(0.5), "A");
  assert.ok(close > far, "closer hand should score higher");
  assert.ok(close <= 1 && far >= 0);
});

test("saves to and loads from storage", () => {
  const storage = fakeStorage();
  const knn = trainedClassifier();
  assert.equal(knn.save(storage), true);
  assert.ok(storage.getItem(STORAGE_KEY));

  const restored = createKnnClassifier({ k: 3 });
  assert.equal(restored.load(storage), true);
  assert.equal(restored.count(), 12);
});

test("load returns false when storage is empty", () => {
  const restored = createKnnClassifier();
  assert.equal(restored.load(fakeStorage()), false);
});
