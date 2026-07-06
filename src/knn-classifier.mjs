const FEATURE_LENGTH = 63;
const DEFAULT_K = 5;
const STORAGE_KEY = "signcoach.knn.samples.v1";

/**
 * A tiny k-nearest-neighbour classifier over normalized hand-landmark feature
 * vectors (see landmark-normalization.mjs). It stores labelled sample vectors
 * and classifies a new vector by a distance-weighted vote of its k closest
 * neighbours.
 *
 * KNN is a deliberate choice here: there is no training step, adding a user's
 * own reference sample takes effect immediately, and the whole model is just an
 * array of vectors that serialises cleanly to localStorage.
 */
export function createKnnClassifier({ k = DEFAULT_K } = {}) {
  let samples = [];

  return {
    /** Adds one labelled feature vector. Ignores malformed vectors. */
    addSample(label, vector) {
      if (!isValidVector(vector) || typeof label !== "string" || label.length === 0) {
        return false;
      }
      samples.push({ label, vector: vector.slice() });
      return true;
    },

    /** Number of stored samples, optionally filtered by label. */
    count(label) {
      if (label === undefined) return samples.length;
      return samples.filter((sample) => sample.label === label).length;
    },

    /** Sorted list of labels that currently have at least one sample. */
    labels() {
      return [...new Set(samples.map((sample) => sample.label))].sort();
    },

    /** Removes every sample for a label. Returns how many were removed. */
    removeLabel(label) {
      const before = samples.length;
      samples = samples.filter((sample) => sample.label !== label);
      return before - samples.length;
    },

    /** Drops all samples. */
    clear() {
      samples = [];
    },

    /**
     * Classifies a feature vector.
     * Returns { label, confidence, distance, neighbors } or null when the model
     * is empty or the vector is malformed. Confidence is the share of the
     * distance-weighted vote won by the top label, in [0, 1].
     */
    classify(vector) {
      if (!isValidVector(vector) || samples.length === 0) return null;

      const effectiveK = Math.min(k, samples.length);
      const ranked = samples
        .map((sample) => ({ label: sample.label, distance: euclidean(vector, sample.vector) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, effectiveK);

      const weights = new Map();
      let totalWeight = 0;
      for (const neighbor of ranked) {
        // Inverse-distance weighting: closer samples count for more, and an
        // exact match (distance 0) dominates without dividing by zero.
        const weight = 1 / (neighbor.distance + 1e-6);
        weights.set(neighbor.label, (weights.get(neighbor.label) || 0) + weight);
        totalWeight += weight;
      }

      let bestLabel = null;
      let bestWeight = -Infinity;
      for (const [label, weight] of weights) {
        if (weight > bestWeight) {
          bestWeight = weight;
          bestLabel = label;
        }
      }

      return {
        label: bestLabel,
        confidence: totalWeight > 0 ? bestWeight / totalWeight : 0,
        distance: ranked[0].distance,
        neighbors: ranked
      };
    },

    /** Serialises all samples to a JSON string for localStorage. */
    toJSON() {
      return JSON.stringify({ version: 1, samples });
    },

    /** Replaces all samples from a JSON string produced by toJSON(). */
    loadJSON(json) {
      const restored = parseSamples(json);
      if (!restored) return false;
      samples = restored;
      return true;
    },

    /** Persists samples to localStorage (browser only). Returns success. */
    save(storage = globalThis.localStorage) {
      if (!storage) return false;
      try {
        storage.setItem(STORAGE_KEY, this.toJSON());
        return true;
      } catch {
        return false;
      }
    },

    /** Loads samples from localStorage (browser only). Returns success. */
    load(storage = globalThis.localStorage) {
      if (!storage) return false;
      const json = storage.getItem(STORAGE_KEY);
      return json ? this.loadJSON(json) : false;
    }
  };
}

export { STORAGE_KEY };

function parseSamples(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || !Array.isArray(parsed.samples)) return null;

  const clean = parsed.samples.filter(
    (sample) => sample && typeof sample.label === "string" && isValidVector(sample.vector)
  );
  return clean.map((sample) => ({ label: sample.label, vector: sample.vector.slice() }));
}

function isValidVector(vector) {
  return (
    Array.isArray(vector) &&
    vector.length === FEATURE_LENGTH &&
    vector.every((value) => Number.isFinite(value))
  );
}

function euclidean(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
