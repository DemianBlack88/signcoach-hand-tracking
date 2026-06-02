import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const MEDIAPIPE_VERSION = "0.10.32";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function createHandTracker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await createLandmarker(vision);
  let lastTimestampMs = 0;
  let lastVideoTime = -1;

  return {
    detect(video, timestampMs = performance.now()) {
      if (video.currentTime === lastVideoTime) {
        return null;
      }

      lastVideoTime = video.currentTime;
      lastTimestampMs = Math.max(timestampMs, lastTimestampMs + 1);
      return normalizeHandResult(landmarker.detectForVideo(video, lastTimestampMs));
    },
    close() {
      landmarker.close();
    }
  };
}

export function getTrackingErrorMessage(error) {
  if (!navigator.onLine) {
    return "Hand tracking needs the MediaPipe model to load. Check the connection and refresh.";
  }

  const detail = getErrorDetail(error);
  return detail.includes("Failed to fetch")
    ? "Hand tracking model could not load on this network. Refresh on a stable HTTPS connection."
    : `Hand tracking could not start. ${detail}`;
}

export function normalizeHandResult(result) {
  const landmarks = result?.landmarks || [];
  const handednesses = result?.handednesses || [];

  return landmarks.map((points, index) => {
    const category = handednesses[index]?.[0];
    return {
      landmarks: points,
      handedness: category?.categoryName || "Unknown",
      confidence: typeof category?.score === "number" ? category.score : 0
    };
  });
}

async function createLandmarker(vision) {
  if (isMobileBrowser()) {
    return createLandmarkerWithDelegate(vision);
  }

  try {
    return await createLandmarkerWithDelegate(vision, "GPU");
  } catch (gpuError) {
    try {
      return await createLandmarkerWithDelegate(vision);
    } catch (cpuError) {
      throw new Error(`GPU: ${getErrorDetail(gpuError)} CPU: ${getErrorDetail(cpuError)}`);
    }
  }
}

function createLandmarkerWithDelegate(vision, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      ...(delegate ? { delegate } : {})
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.45,
    minHandPresenceConfidence: 0.45,
    minTrackingConfidence: 0.45
  });
}

function getErrorDetail(error) {
  return error?.message || error?.name || "Unknown MediaPipe initialization error.";
}

function isMobileBrowser() {
  return navigator.maxTouchPoints > 1 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
