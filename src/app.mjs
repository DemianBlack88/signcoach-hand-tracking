import { getCameraErrorMessage, getCameraSupport, startCamera, stopCamera } from "./camera.mjs";
import { createHandTracker, getTrackingErrorMessage } from "./hand-tracking.mjs";
import { drawHands, resizeOverlay } from "./overlay-renderer.mjs";
import { evaluateHandshape, HANDSHAPE_INSTRUCTIONS } from "./gesture-rules.mjs";
import { createFeedbackState } from "./feedback.mjs";
import { HANDSHAPE_REFERENCES } from "./reference-handshapes.mjs";
import { renderHandshapeReference } from "./reference-images.mjs";
import { createKnnClassifier } from "./knn-classifier.mjs";
import { createSampleRecorder } from "./sample-recorder.mjs";
import { landmarksToFeatureVector } from "./landmark-normalization.mjs";

const els = {
  video: document.querySelector("#cameraVideo"),
  canvas: document.querySelector("#overlayCanvas"),
  cameraMessage: document.querySelector("#cameraMessage"),
  statusBadge: document.querySelector("#statusBadge"),
  targetLetter: document.querySelector("#targetLetter"),
  instructionText: document.querySelector("#instructionText"),
  referenceImage: document.querySelector("#referenceImage"),
  referenceTitle: document.querySelector("#referenceTitle"),
  referenceCues: document.querySelector("#referenceCues"),
  collapsedReference: document.querySelector("#collapsedReference"),
  collapsedTarget: document.querySelector("#collapsedTarget"),
  collapsedFeedback: document.querySelector("#collapsedFeedback"),
  collapsedHold: document.querySelector("#collapsedHold"),
  collapsedScore: document.querySelector("#collapsedScore"),
  matchScore: document.querySelector("#matchScore"),
  shapeScore: document.querySelector("#shapeScore"),
  holdProgress: document.querySelector("#holdProgress"),
  finalStatus: document.querySelector("#finalStatus"),
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
  trainingBox: document.querySelector(".training-box"),
  trainingSamples: document.querySelector("#trainingSamples"),
  trainingStatus: document.querySelector("#trainingStatus"),
  trainingPrediction: document.querySelector("#trainingPrediction"),
  recordButton: document.querySelector("#recordButton"),
  clearLetterButton: document.querySelector("#clearLetterButton"),
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
const classifier = createKnnClassifier();
classifier.load();
const recorder = createSampleRecorder(classifier);

function setTarget(nextTarget) {
  if (recorder.recording) recorder.cancel();
  target = nextTarget;
  els.targetLetter.textContent = target;
  els.collapsedTarget.textContent = target;
  els.instructionText.textContent = HANDSHAPE_INSTRUCTIONS[target];
  updateReference(target);
  els.letterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.target === target);
  });
  feedbackState.reset();
  updateTrainingControls();
}

function updateTrainingControls() {
  const count = classifier.count(target);
  els.recordButton.textContent = `Record ${target}`;
  els.clearLetterButton.textContent = `Clear ${target}`;
  els.clearLetterButton.disabled = count === 0;
  els.trainingSamples.textContent = `${count} example${count === 1 ? "" : "s"} for ${target}`;
  setRecordingUi(false);
}

function setRecordingUi(isRecording) {
  els.recordButton.classList.toggle("is-recording", isRecording);
  els.trainingBox.classList.toggle("is-recording", isRecording);
  els.recordButton.textContent = isRecording ? "Recording…" : `Record ${target}`;
}

function handleRecordClick() {
  if (!running) {
    els.trainingStatus.textContent = "Start the camera before recording.";
    return;
  }
  if (recorder.recording) {
    recorder.cancel();
    setRecordingUi(false);
    els.trainingStatus.textContent = `Recording cancelled for ${target}.`;
    return;
  }
  recorder.start(target);
  setRecordingUi(true);
  els.trainingStatus.textContent = `Hold the ${target} shape…`;
}

function handleClearLetter() {
  if (recorder.recording) recorder.cancel();
  classifier.removeLabel(target);
  classifier.save();
  updateTrainingControls();
  els.trainingStatus.textContent = `Cleared saved examples for ${target}.`;
  els.trainingPrediction.textContent = "Recognized: —";
}

function updateReference(nextTarget) {
  const reference = HANDSHAPE_REFERENCES[nextTarget];
  if (!reference) return;

  els.referenceImage.innerHTML = renderHandshapeReference(nextTarget);
  els.collapsedReference.innerHTML = renderHandshapeReference(nextTarget, { compact: true });
  els.referenceTitle.textContent = reference.title;
  els.referenceCues.innerHTML = reference.cues.map((cue) => `<li>${cue}</li>`).join("");
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
  const holdPercent = Math.round(stable.holdProgress * 100);

  els.statusBadge.textContent = "Hand detected";
  els.statusBadge.dataset.state = "detected";
  els.detectionStatus.textContent = `${primaryHand.handedness} hand detected`;
  els.feedbackMessage.textContent = stable.feedback;
  els.matchScore.textContent = `${scorePercent}%`;
  updateCoachMetrics(scorePercent, holdPercent, getPracticeStatus(stable));
  updateCollapsedSummary(stable.feedback, scorePercent, holdPercent);
  els.cameraMessage.hidden = true;

  updateTraining(primaryHand);

  updateDebug({
    detected: true,
    handedness: primaryHand.handedness,
    confidence: primaryHand.confidence,
    score: evaluation.score,
    feedback: stable.feedback
  });
}

function updateTraining(primaryHand) {
  if (recorder.recording) {
    const progress = recorder.capture(primaryHand.landmarks, { handedness: primaryHand.handedness });
    if (progress.done) {
      classifier.save();
      updateTrainingControls();
      els.trainingStatus.textContent = `Saved ${progress.captured} examples of ${progress.label}.`;
    } else {
      els.trainingStatus.textContent = `Recording ${target}… ${progress.captured}/${progress.target}`;
    }
    return;
  }

  const vector = landmarksToFeatureVector(primaryHand.landmarks, { handedness: primaryHand.handedness });
  const prediction = vector ? classifier.classify(vector) : null;
  els.trainingPrediction.textContent = prediction
    ? `Recognized: ${prediction.label} (${Math.round(prediction.confidence * 100)}%)`
    : "Recognized: — (record examples first)";
}

function updateNoHandState(feedback) {
  const stable = feedbackState.update({ score: 0, feedback });
  els.statusBadge.textContent = "No hand";
  els.statusBadge.dataset.state = "waiting";
  els.detectionStatus.textContent = "No hand detected";
  els.feedbackMessage.textContent = stable.feedback;
  els.matchScore.textContent = "0%";
  updateCoachMetrics(0, 0, "Waiting");
  updateCollapsedSummary(stable.feedback, 0, 0);

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

function updateCoachMetrics(scorePercent, holdPercent, status) {
  els.shapeScore.textContent = `${scorePercent}%`;
  els.holdProgress.textContent = `${holdPercent}%`;
  els.finalStatus.textContent = status;
}

function updateCollapsedSummary(feedback, scorePercent, holdPercent) {
  els.collapsedFeedback.textContent = feedback;
  els.collapsedScore.textContent = `${scorePercent}%`;
  els.collapsedHold.textContent = `Hold: ${holdPercent}%`;
}

function getPracticeStatus(stable) {
  if (stable.strongMatch) return "Possible match";
  if (stable.smoothedScore >= 0.78) return "Hold";
  if (stable.smoothedScore >= 0.45) return "Adjust";
  return "Practice";
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
els.recordButton.addEventListener("click", handleRecordClick);
els.clearLetterButton.addEventListener("click", handleClearLetter);
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
