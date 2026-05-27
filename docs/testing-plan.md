# Testing Plan

## Desktop test

- Camera starts
- Hand detected
- Landmarks align with hand
- A/B/L selector works
- Feedback changes when handshape changes
- Debug toggle works
- No crash when hand leaves frame

## Mobile test

- App opens on phone
- Camera permission works
- Rear camera works if supported
- Overlay aligns with video
- Buttons are usable
- Feedback readable
- Rotation/orientation does not break layout

## Gesture test

- A gives possible match with fist-like shape
- B gives possible match with flat hand shape
- L gives possible match with thumb and index extended
- Wrong shapes give useful feedback
- No hand gives "Hand not detected"
