import { landmarksToFeatureVector } from "./landmark-normalization.mjs";

const DEFAULT_FRAMES = 30;

/**
 * Drives a "record N reference frames for a letter" session on top of a KNN
 * classifier. Each captured frame becomes one labelled sample, so a short
 * recording gives the classifier a small cluster to vote with.
 *
 * The recorder holds no DOM and no camera state: the render loop feeds it one
 * frame of landmarks at a time and reads back the progress it should display.
 */
export function createSampleRecorder(classifier, { framesPerSample = DEFAULT_FRAMES } = {}) {
  let label = null;
  let captured = 0;
  let target = framesPerSample;

  function status(extra = {}) {
    return {
      recording: label !== null,
      label,
      captured,
      target,
      progress: target > 0 ? Math.min(1, captured / target) : 0,
      done: false,
      added: false,
      ...extra
    };
  }

  return {
    get recording() {
      return label !== null;
    },

    /** Begins a session for `nextLabel`. Returns false for an invalid label. */
    start(nextLabel, frames = framesPerSample) {
      if (typeof nextLabel !== "string" || nextLabel.length === 0) return false;
      label = nextLabel;
      captured = 0;
      target = frames > 0 ? frames : framesPerSample;
      return true;
    },

    /** Abandons the current session without saving anything further. */
    cancel() {
      label = null;
      captured = 0;
    },

    /**
     * Feeds one frame. Frames without a usable hand are ignored (not counted),
     * so the count reflects real captured examples. Returns a status object;
     * when the last needed frame lands, `done` is true and the session ends.
     */
    capture(landmarks, { handedness = "Right" } = {}) {
      if (label === null) return status();

      const vector = landmarksToFeatureVector(landmarks, { handedness });
      if (!vector || !classifier.addSample(label, vector)) {
        return status();
      }

      captured += 1;
      if (captured >= target) {
        const finishedLabel = label;
        const finishedCount = captured;
        label = null;
        return {
          recording: false,
          label: finishedLabel,
          captured: finishedCount,
          target,
          progress: 1,
          done: true,
          added: true
        };
      }

      return status({ added: true });
    }
  };
}
