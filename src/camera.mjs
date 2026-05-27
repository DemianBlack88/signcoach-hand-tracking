const CAMERA_ERRORS = {
  NotAllowedError: "Camera permission was blocked. Allow camera access and try again.",
  NotFoundError: "No camera was found on this device.",
  NotReadableError: "The camera is already in use by another app.",
  OverconstrainedError: "The requested camera is not available on this device."
};

export function getCameraErrorMessage(error) {
  return CAMERA_ERRORS[error?.name] || "The camera could not start. Check browser permissions and try again.";
}

export async function startCamera(video, facingMode = "environment") {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not supported in this browser.");
  }

  stopCamera(video);

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });

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
