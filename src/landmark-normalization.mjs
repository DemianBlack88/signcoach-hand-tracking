const REQUIRED_LANDMARKS = 21;
const WRIST = 0;
const MIDDLE_MCP = 9;
const INDEX_MCP = 5;
const PINKY_MCP = 17;
const MIN_HAND_SCALE = 1e-6;

/**
 * Converts raw MediaPipe hand landmarks into a pose-invariant feature vector.
 *
 * Invariances applied, in order:
 * 1. Translation: the wrist becomes the origin.
 * 2. Scale: coordinates are divided by the hand size, so distance from the
 *    camera stops mattering.
 * 3. Rotation (in the image plane): the wrist -> middle-finger-MCP direction is
 *    aligned to point straight up, so tilting the hand stops mattering.
 * 4. Optional mirroring: left hands can be flipped to match right-hand samples,
 *    so one recorded dataset covers both hands.
 *
 * The z coordinate is kept (scaled with the same factor) because relative depth
 * separates shapes that look identical in 2D, such as folded vs stacked fingers.
 */
export function normalizeLandmarks(landmarks, { mirror = false } = {}) {
  if (!hasRequiredLandmarks(landmarks)) return null;

  const wrist = landmarks[WRIST];
  const translated = landmarks.map((point) => ({
    x: point.x - wrist.x,
    y: point.y - wrist.y,
    z: (point.z ?? 0) - (wrist.z ?? 0)
  }));

  const scale = Math.max(getHandScale(translated), MIN_HAND_SCALE);
  const scaled = translated.map((point) => ({
    x: point.x / scale,
    y: point.y / scale,
    z: point.z / scale
  }));

  const reference = scaled[MIDDLE_MCP];
  const referenceLength = Math.hypot(reference.x, reference.y);
  // Rotate so the wrist -> middle MCP direction points straight up (0, -L in
  // image coords). Solving R * reference = (0, -L) for a proper rotation gives
  // cos = -ref.y / L and sin = -ref.x / L.
  const cos = referenceLength > MIN_HAND_SCALE ? -reference.y / referenceLength : 1;
  const sin = referenceLength > MIN_HAND_SCALE ? -reference.x / referenceLength : 0;

  return scaled.map((point) => ({
    x: (point.x * cos - point.y * sin) * (mirror ? -1 : 1),
    y: point.x * sin + point.y * cos,
    z: point.z
  }));
}

/**
 * Flattens normalized landmarks into the 63-number vector used by the classifier.
 * The wrist entry is included even though it is always (0, 0, 0); keeping the
 * layout aligned with landmark indices makes debugging easier and costs nothing.
 */
export function toFeatureVector(normalizedLandmarks) {
  if (!hasRequiredLandmarks(normalizedLandmarks)) return null;
  return normalizedLandmarks.flatMap((point) => [point.x, point.y, point.z ?? 0]);
}

/**
 * One-step helper: raw MediaPipe landmarks -> feature vector.
 * Pass the MediaPipe handedness label so left hands are mirrored onto the
 * right-hand reference frame.
 */
export function landmarksToFeatureVector(landmarks, { handedness = "Right" } = {}) {
  const normalized = normalizeLandmarks(landmarks, { mirror: handedness === "Left" });
  return normalized ? toFeatureVector(normalized) : null;
}

function getHandScale(landmarks) {
  const palmHeight = distance(landmarks[WRIST], landmarks[MIDDLE_MCP]);
  const palmSpan = distance(landmarks[INDEX_MCP], landmarks[PINKY_MCP]);
  return Math.max(palmHeight, palmSpan);
}

function hasRequiredLandmarks(landmarks) {
  return (
    Array.isArray(landmarks) &&
    landmarks.length >= REQUIRED_LANDMARKS &&
    landmarks.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))
  );
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
