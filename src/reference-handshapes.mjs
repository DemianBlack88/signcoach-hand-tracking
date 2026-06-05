import referenceAUrl from "./assets/reference-a.jpg";
import referenceBUrl from "./assets/reference-b.jpg";
import referenceLUrl from "./assets/reference-l.jpg";

export const HANDSHAPE_REFERENCES = {
  A: {
    title: "A from ASL alphabet chart",
    cues: ["Match the fist shape shown in the reference", "Thumb stays visible along the side"],
    imageUrl: referenceAUrl
  },
  B: {
    title: "B from ASL alphabet chart",
    cues: ["Hold the hand flat like the reference", "Keep four fingers straight together"],
    imageUrl: referenceBUrl
  },
  L: {
    title: "L from ASL alphabet chart",
    cues: ["Index finger points up", "Thumb opens to the side"],
    imageUrl: referenceLUrl
  }
};
