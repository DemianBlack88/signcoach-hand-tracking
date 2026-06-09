export const HANDSHAPE_INSTRUCTIONS = {
  A: "Make a fist. Keep the thumb along the side, not pointing up.",
  B: "Face your palm to the camera. Keep four fingers straight together and fold the thumb across.",
  L: "Point your index finger up, open the thumb to the side, and fold the other fingers."
};

const FINGER_TIPS = {
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20
};

const FINGER_PIPS = {
  index: 6,
  middle: 10,
  ring: 14,
  pinky: 18
};

const REQUIRED_LANDMARKS = 21;

export function evaluateHandshape(target, landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < REQUIRED_LANDMARKS) {
    return safeResult(target, "Hand not detected");
  }

  const features = getHandFeatures(landmarks);
  const evaluator = {
    A: evaluateA,
    B: evaluateB,
    L: evaluateL
  }[target];

  if (!evaluator) {
    return safeResult(target, "Move hand into the camera frame");
  }

  return {
    target,
    ...evaluator(features),
    features
  };
}

export function isFingerExtended(landmarks, fingerName) {
  const tip = landmarks?.[FINGER_TIPS[fingerName]];
  const pip = landmarks?.[FINGER_PIPS[fingerName]];
  const wrist = landmarks?.[0];
  if (!tip || !pip || !wrist) return false;

  const verticalExtension = pip.y - tip.y;
  const wristDistanceTip = distance(tip, wrist);
  const wristDistancePip = distance(pip, wrist);
  return verticalExtension > 0.035 && wristDistanceTip > wristDistancePip * 1.08;
}

export function isFingerFolded(landmarks, fingerName) {
  const tip = landmarks?.[FINGER_TIPS[fingerName]];
  const pip = landmarks?.[FINGER_PIPS[fingerName]];
  if (!tip || !pip) return false;

  return tip.y >= pip.y - 0.015;
}

export function getHandFeatures(landmarks) {
  const extended = {
    index: isFingerExtended(landmarks, "index"),
    middle: isFingerExtended(landmarks, "middle"),
    ring: isFingerExtended(landmarks, "ring"),
    pinky: isFingerExtended(landmarks, "pinky")
  };

  const folded = {
    index: isFingerFolded(landmarks, "index"),
    middle: isFingerFolded(landmarks, "middle"),
    ring: isFingerFolded(landmarks, "ring"),
    pinky: isFingerFolded(landmarks, "pinky")
  };

  const extendedCount = Object.values(extended).filter(Boolean).length;
  const foldedCount = Object.values(folded).filter(Boolean).length;
  const thumbOpen = isThumbOpen(landmarks);
  const thumbRaised = isThumbRaised(landmarks);
  const palmSpan = distance(landmarks[5], landmarks[17]);
  const palmHeight = distance(landmarks[0], landmarks[9]);
  const handSize = Math.max(palmSpan, palmHeight);
  const indexThumbAngle = angleBetween(landmarks[8], landmarks[5], landmarks[4]);
  const fingerSpread = averageTipSpread(landmarks);

  return {
    extended,
    folded,
    extendedCount,
    foldedCount,
    thumbOpen,
    thumbRaised,
    handSize,
    fingerSpread,
    indexThumbAngle,
    palmLikelyFacingCamera: palmSpan > 0.12
  };
}

function evaluateA(features) {
  let score = 0;
  score += features.foldedCount / 4 * 0.56;
  score += !features.thumbOpen ? 0.18 : 0.05;
  score += !features.thumbRaised ? 0.08 : 0;
  score += features.handSize >= 0.11 && features.handSize <= 0.42 ? 0.2 : 0.05;
  if (features.thumbRaised) score = Math.min(score, 0.72);

  return {
    score: clamp(score),
    feedback: pickFeedback(score, [
      [features.foldedCount < 3, "Try folding the other fingers"],
      [features.thumbRaised, "Keep the thumb on the side, not up"],
      [features.thumbOpen, "Thumb position looks off"],
      [features.handSize < 0.08, "Too far from camera"],
      [features.handSize > 0.48, "Too close to camera"]
    ])
  };
}

function evaluateB(features) {
  let score = 0;
  score += features.extendedCount / 4 * 0.58;
  score += features.fingerSpread < 0.09 ? 0.16 : 0.06;
  score += !features.thumbOpen ? 0.13 : 0.04;
  score += features.palmLikelyFacingCamera ? 0.13 : 0.03;

  return {
    score: clamp(score),
    feedback: pickFeedback(score, [
      [features.extendedCount < 4, "Try extending all four fingers"],
      [features.fingerSpread >= 0.11, "Keep the fingers closer together"],
      [features.thumbOpen, "Thumb position looks off"],
      [!features.palmLikelyFacingCamera, "Palm direction may be wrong"]
    ])
  };
}

function evaluateL(features) {
  const otherFingersFolded = [features.folded.middle, features.folded.ring, features.folded.pinky].filter(Boolean).length;
  const angleLooksLikeL = features.indexThumbAngle >= 55 && features.indexThumbAngle <= 125;

  let score = 0;
  score += features.extended.index ? 0.32 : 0;
  score += features.thumbOpen ? 0.28 : 0;
  score += otherFingersFolded / 3 * 0.25;
  score += angleLooksLikeL ? 0.15 : 0.03;

  return {
    score: clamp(score),
    feedback: pickFeedback(score, [
      [!features.extended.index, "Try extending your index finger"],
      [!features.thumbOpen, "Thumb position looks off"],
      [otherFingersFolded < 2, "Try folding the other fingers"],
      [!angleLooksLikeL, "Open the index and thumb into an L shape"]
    ])
  };
}

function pickFeedback(score, checks) {
  if (score >= 0.78) return "Possible match";
  const issue = checks.find(([condition]) => condition);
  return issue?.[1] || "Hold your hand steady";
}

function safeResult(target, feedback) {
  return {
    target,
    score: 0,
    feedback,
    features: null
  };
}

function isThumbOpen(landmarks) {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  if (!thumbTip || !thumbIp || !indexMcp || !pinkyMcp) return false;

  const palmWidth = distance(indexMcp, pinkyMcp);
  return distance(thumbTip, indexMcp) > palmWidth * 0.62 && distance(thumbTip, thumbIp) > palmWidth * 0.18;
}

function isThumbRaised(landmarks) {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexMcp = landmarks[5];
  const wrist = landmarks[0];
  if (!thumbTip || !thumbIp || !indexMcp || !wrist) return false;

  const thumbAboveIndex = thumbTip.y < indexMcp.y - 0.035;
  const thumbExtendedFromWrist = distance(thumbTip, wrist) > distance(thumbIp, wrist) * 1.08;
  return thumbAboveIndex && thumbExtendedFromWrist;
}

function averageTipSpread(landmarks) {
  const pairs = [
    [8, 12],
    [12, 16],
    [16, 20]
  ];
  return pairs.reduce((total, [a, b]) => total + distance(landmarks[a], landmarks[b]), 0) / pairs.length;
}

function angleBetween(a, center, b) {
  if (!a || !center || !b) return 0;
  const ab = { x: a.x - center.x, y: a.y - center.y };
  const cb = { x: b.x - center.x, y: b.y - center.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (mag === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI);
}

function distance(a, b) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}
