import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function createHandTracker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await createLandmarker(vision);

  return {
    detect(video, timestampMs = performance.now()) {
      return normalizeHandResult(landmarker.detectForVideo(video, timestampMs));
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

  return error?.message?.includes("Failed to fetch")
    ? "Hand tracking model could not load on this network. Refresh on a stable HTTPS connection."
    : "Hand tracking could not start on this browser. The camera may still work without landmarks.";
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
  try {
    return await createLandmarkerWithDelegate(vision, "GPU");
  } catch (_error) {
    return createLandmarkerWithDelegate(vision, "CPU");
  }
}

function createLandmarkerWithDelegate(vision, delegate) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate
    },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.45,
    minHandPresenceConfidence: 0.45,
    minTrackingConfidence: 0.45
  });
}
