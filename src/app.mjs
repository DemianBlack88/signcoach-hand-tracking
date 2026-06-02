import { getCameraErrorMessage, getCameraSupport, startCamera, stopCamera } from "./camera.mjs";
import { createHandTracker, getTrackingErrorMessage } from "./hand-tracking.mjs";
import { drawHands, resizeOverlay } from "./overlay-renderer.mjs";
import { evaluateHandshape, HANDSHAPE_INSTRUCTIONS } from "./gesture-rules.mjs";
import { createFeedbackState } from "./feedback.mjs";

const els = {
  video: document.querySelector("#cameraVideo"),
  canvas: document.querySelector("#overlayCanvas"),
  cameraMessage: document.querySelector("#cameraMessage"),
  statusBadge: document.querySelector("#statusBadge"),
  targetLetter: document.querySelector("#targetLetter"),
  instructionText: document.querySelector("#instructionText"),
  matchScore: document.querySelector("#matchScore"),
  detectionStatus: document.querySelector("#detectionStatus"),
  feedbackMessage: document.querySelector("#feedbackMessage"),
  lessonPanel: document.querySelector("#lessonPanel"),
  panelToggle: document.querySelector("#panelToggle"),
  startButton: document.querySelector("#startButton"),
  switchButton: document.querySelector("#switchButton"),
  resetButton: document.querySelector("#resetButton"),
  debugButton: document.querySelector("#debugButton"),
  debugPanel: document.querySelector("#debugPanel"),
  debugDetected: document.querySelector("#debugDetected"),
  debugHandedness: document.querySelector("#debugHandedness"),
  debugConfidence: document.querySelector("#debugConfidence"),
  debugTarget: document.querySelector("#debugTarget"),
  debugScore: document.querySelector("#debugScore"),
  debugFeedback: document.querySelector("#debugFeedback"),
  debugFps: document.querySelector("#debugFps"),
  letterButtons: [...document.querySelectorAll(".letter-button")]
};

let target = "A";
let facingMode = "environment";
let tracker = null;
let running = false;
let cameraSwitching = false;
let animationId = null;
let lastFrameAt = performance.now();
let fps = 0;

const feedbackState = createFeedbackState();

function setTarget(nextTarget) {
  target = nextTarget;
  els.targetLetter.textContent = target;
  els.instructionText.textContent = HANDSHAPE_INSTRUCTIONS[target];
  els.letterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.target === target);
  });
  feedbackState.reset();
}

async function handleStartCamera() {
  const support = getCameraSupport();
  if (!support.ok) {
    setCameraMessage("Camera unavailable", `${support.message} ${support.detail}`);
    updateNoHandState("Move hand into the camera frame");
    return;
  }

  setCameraMessage("Starting camera", "Allow camera access when your browser asks.");
  els.startButton.disabled = true;

  try {
    await startCamera(els.video, facingMode);
    running = true;
    els.startButton.textContent = "Camera On";
    els.switchButton.disabled = false;
  } catch (error) {
    running = false;
    els.startButton.disabled = false;
    const detail = error?.detail ? ` ${error.detail}` : "";
    setCameraMessage("Camera unavailable", `${getCameraErrorMessage(error)}${detail}`);
    updateNoHandState("Move hand into the camera frame");
    return;
  }

  setCameraMessage("Loading hand tracker", "The model may take a moment on the first run.");

  try {
    tracker ??= await createHandTracker();
    setCameraMessage("", "");
    loop();
  } catch (error) {
    setCameraMessage("Hand tracking unavailable", getTrackingErrorMessage(error));
    updateNoHandState("Hand tracking could not start");
  }
}

async function handleSwitchCamera() {
  if (!running || cameraSwitching) return;

  const previousFacingMode = facingMode;
  const nextFacingMode = facingMode === "environment" ? "user" : "environment";
  cameraSwitching = true;
  els.switchButton.disabled = true;
  setCameraMessage("Switching camera", "Starting the other camera.");

  try {
    await startCamera(els.video, nextFacingMode);
    facingMode = nextFacingMode;
    setCameraMessage("", "");
  } catch (error) {
    facingMode = previousFacingMode;
    setCameraMessage("Camera switch failed", getCameraErrorMessage(error));
  } finally {
    cameraSwitching = false;
    els.switchButton.disabled = false;
  }
}

function handleReset() {
  feedbackState.reset();
  updateNoHandState("Move hand into the camera frame");
}

function loop(now = performance.now()) {
  if (!running || !tracker) return;

  resizeOverlay(els.canvas, els.video);

  if (cameraSwitching || els.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    animationId = requestAnimationFrame(loop);
    return;
  }

  const delta = Math.max(1, now - lastFrameAt);
  fps = Math.round(1000 / delta);
  lastFrameAt = now;

  let hands = [];
  try {
    hands = tracker.detect(els.video, now);
  } catch (error) {
    setCameraMessage("Hand tracking paused", getTrackingErrorMessage(error));
    updateNoHandState("Hand tracking could not start");
    running = false;
    return;
  }

  if (!hands) {
    animationId = requestAnimationFrame(loop);
    return;
  }

  drawHands(els.canvas, hands);

  if (hands.length === 0) {
    updateNoHandState("Hand not detected");
  } else {
    updateDetectedState(hands, now);
  }

  animationId = requestAnimationFrame(loop);
}

function updateDetectedState(hands, now) {
  const primaryHand = hands[0];
  const evaluation = evaluateHandshape(target, primaryHand.landmarks);
  const stable = feedbackState.update(evaluation, now);
  const scorePercent = Math.round(stable.smoothedScore * 100);

  els.statusBadge.textContent = "Hand detected";
  els.statusBadge.dataset.state = "detected";
  els.detectionStatus.textContent = `${primaryHand.handedness} hand detected`;
  els.feedbackMessage.textContent = stable.feedback;
  els.matchScore.textContent = `${scorePercent}%`;
  els.cameraMessage.hidden = true;

  updateDebug({
    detected: true,
    handedness: primaryHand.handedness,
    confidence: primaryHand.confidence,
    score: evaluation.score,
    feedback: stable.feedback
  });
}

function updateNoHandState(feedback) {
  const stable = feedbackState.update({ score: 0, feedback });
  els.statusBadge.textContent = "No hand";
  els.statusBadge.dataset.state = "waiting";
  els.detectionStatus.textContent = "No hand detected";
  els.feedbackMessage.textContent = stable.feedback;
  els.matchScore.textContent = "0%";

  updateDebug({
    detected: false,
    handedness: "-",
    confidence: 0,
    score: 0,
    feedback: stable.feedback
  });
}

function updateDebug({ detected, handedness, confidence, score, feedback }) {
  els.debugDetected.textContent = detected ? "yes" : "no";
  els.debugHandedness.textContent = handedness || "-";
  els.debugConfidence.textContent = Number.isFinite(confidence) ? confidence.toFixed(2) : "-";
  els.debugTarget.textContent = target;
  els.debugScore.textContent = Number.isFinite(score) ? score.toFixed(2) : "0";
  els.debugFeedback.textContent = feedback;
  els.debugFps.textContent = fps ? String(fps) : "-";
}

function setCameraMessage(title, detail) {
  if (!title && !detail) {
    els.cameraMessage.hidden = true;
    return;
  }

  els.cameraMessage.hidden = false;
  els.cameraMessage.querySelector("strong").textContent = title;
  els.cameraMessage.querySelector("span").textContent = detail;
}

window.addEventListener("resize", () => resizeOverlay(els.canvas, els.video));
window.addEventListener("orientationchange", () => resizeOverlay(els.canvas, els.video));
window.addEventListener("beforeunload", () => {
  if (animationId) cancelAnimationFrame(animationId);
  stopCamera(els.video);
  tracker?.close();
});

els.startButton.addEventListener("click", handleStartCamera);
els.switchButton.addEventListener("click", handleSwitchCamera);
els.resetButton.addEventListener("click", handleReset);
els.panelToggle.addEventListener("click", () => {
  const collapsed = els.lessonPanel.classList.toggle("is-collapsed");
  els.panelToggle.setAttribute("aria-expanded", String(!collapsed));
  els.panelToggle.setAttribute("aria-label", collapsed ? "Expand practice controls" : "Collapse practice controls");
  els.panelToggle.setAttribute("title", collapsed ? "Expand practice controls" : "Collapse practice controls");
});
els.debugButton.addEventListener("click", () => {
  const isHidden = els.debugPanel.hidden;
  els.debugPanel.hidden = !isHidden;
  els.debugButton.setAttribute("aria-expanded", String(isHidden));
});
els.letterButtons.forEach((button) => {
  button.addEventListener("click", () => setTarget(button.dataset.target));
});

els.switchButton.disabled = true;
setTarget(target);
updateNoHandState("Move hand into the camera frame");
showInitialCameraState();

function showInitialCameraState() {
  const support = getCameraSupport();
  if (!support.ok) {
    setCameraMessage("Camera unavailable", `${support.message} ${support.detail}`);
    return;
  }

  setCameraMessage("Camera ready", "Tap Start Camera, then allow camera permission.");
}
