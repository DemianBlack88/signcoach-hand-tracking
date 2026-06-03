import aslAlphabetReferenceUrl from "./assets/asl-alphabet-reference.jpg";

export const HANDSHAPE_REFERENCES = {
  A: {
    title: "A from ASL alphabet chart",
    cues: ["Match the fist shape shown in the reference", "Thumb stays visible along the side"],
    imageUrl: aslAlphabetReferenceUrl,
    cropPosition: "16px -32px",
    cropSize: "720px auto"
  },
  B: {
    title: "B from ASL alphabet chart",
    cues: ["Hold the hand flat like the reference", "Keep four fingers straight together"],
    imageUrl: aslAlphabetReferenceUrl,
    cropPosition: "-72px -32px",
    cropSize: "720px auto"
  },
  L: {
    title: "L from ASL alphabet chart",
    cues: ["Index finger points up", "Thumb opens to the side"],
    imageUrl: aslAlphabetReferenceUrl,
    cropPosition: "-565px -255px",
    cropSize: "720px auto"
  }
};
