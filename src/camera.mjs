const CAMERA_ERRORS = {
  InsecureContextError: "Camera permission cannot open from this URL. Use HTTPS or localhost.",
  NotAllowedError: "Camera permission was blocked. Allow camera access and try again.",
  NotFoundError: "No camera was found on this device.",
  NotReadableError: "The camera is already in use by another app.",
  OverconstrainedError: "The requested camera is not available on this device.",
  UnsupportedCameraError: "This browser does not expose camera access to the page."
};

export function getCameraErrorMessage(error) {
  return error?.message || CAMERA_ERRORS[error?.name] || "The camera could not start. Check browser permissions and try again.";
}

export function getCameraSupport() {
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  const isSecureContext = Boolean(window.isSecureContext);
  const hasMediaDevices = Boolean(navigator.mediaDevices);
  const hasGetUserMedia = Boolean(navigator.mediaDevices?.getUserMedia);
  const currentUrl = window.location.href;

  if (!isSecureContext) {
    return {
      ok: false,
      name: "InsecureContextError",
      detail: `Current URL is not a secure browser context: ${currentUrl}`,
      message: isLocalHost
        ? "Camera access is blocked in this browser context. Try a different browser or HTTPS."
        : "Camera permission will not appear from this URL. Open the app with HTTPS on the phone."
    };
  }

  if (!hasMediaDevices || !hasGetUserMedia) {
    return {
      ok: false,
      name: "UnsupportedCameraError",
      detail: `Secure context: ${isSecureContext}. mediaDevices: ${hasMediaDevices}. getUserMedia: ${hasGetUserMedia}.`,
      message: "This browser does not expose camera access here. Try Chrome or Safari from an HTTPS URL."
    };
  }

  return {
    ok: true,
    name: "CameraSupported",
    detail: `Secure context: ${isSecureContext}. Protocol: ${protocol}. Host: ${host}.`,
    message: "Camera access is available. Tap Start Camera and allow permission."
  };
}

export async function startCamera(video, facingMode = "environment") {
  const support = getCameraSupport();
  if (!support.ok) {
    const error = new Error(support.message);
    error.name = support.name;
    error.detail = support.detail;
    throw error;
  }

  stopCamera(video);

  const stream = await getCameraStream(facingMode);

  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(video) {
  const stream = video?.srcObject;
  if (!stream) return;

  for (const track of stream.getTracks()) {
    track.stop();
  }

  video.srcObject = null;
}

async function getCameraStream(facingMode) {
  const preferred = {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  try {
    return await navigator.mediaDevices.getUserMedia(preferred);
  } catch (error) {
    if (error?.name === "NotAllowedError" || error?.name === "NotFoundError") {
      throw error;
    }
  }

  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true
  });
}
