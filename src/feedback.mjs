const DEFAULT_WINDOW_SIZE = 8;
const HOLD_MS = 1000;

export function createFeedbackState(windowSize = DEFAULT_WINDOW_SIZE) {
  let scores = [];
  let currentFeedback = "Hand not detected";
  let holdStartedAt = null;

  return {
    update(result, now = performance.now()) {
      const rawScore = Number.isFinite(result?.score) ? result.score : 0;
      scores = [...scores, rawScore].slice(-windowSize);
      const smoothedScore = scores.reduce((total, score) => total + score, 0) / scores.length;

      if (smoothedScore >= 0.78) {
        holdStartedAt ??= now;
      } else {
        holdStartedAt = null;
      }

      const heldMs = holdStartedAt ? now - holdStartedAt : 0;
      const nextFeedback = buildStableFeedback(result?.feedback, smoothedScore, heldMs);

      if (nextFeedback !== currentFeedback && (smoothedScore < 0.78 || heldMs > 250)) {
        currentFeedback = nextFeedback;
      }

      return {
        rawScore,
        smoothedScore,
        holdProgress: Math.min(1, heldMs / HOLD_MS),
        feedback: currentFeedback,
        strongMatch: smoothedScore >= 0.78 && heldMs >= HOLD_MS
      };
    },
    reset() {
      scores = [];
      currentFeedback = "Hand not detected";
      holdStartedAt = null;
    }
  };
}

function buildStableFeedback(feedback, score, heldMs) {
  if (!feedback || feedback === "Hand not detected") return "Hand not detected";
  if (score >= 0.78 && heldMs >= HOLD_MS) return "Possible match";
  if (score >= 0.78) return "Hold your hand steady";
  return feedback;
}
