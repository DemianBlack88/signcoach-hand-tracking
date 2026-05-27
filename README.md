# SignCoach Hand Tracking

SignCoach Hand Tracking is a browser-based non-commercial portfolio prototype for practicing basic sign language handshapes using real-time camera hand tracking.

## Important disclaimer

This is not a certified ASL learning app.
This is not a sign language translator.
This prototype only gives rough practice feedback for basic handshapes.

## Why this project exists

The idea came from testing a separate AR nail guide project. That test showed that camera-based finger and hand tracking could be useful beyond nail guidance, especially for educational practice tools.

SignCoach is a separate project. It does not reuse nail app UI, nail overlay controls, manicure terminology, or nail-specific logic.

## V0 features

- Live browser camera
- MediaPipe hand landmark detection
- Hand skeleton overlay
- Basic ASL handshape selector for A, B, and L
- Rough rule-based feedback
- Mobile-friendly layout
- Debug mode

## How to run on Windows

1. Open PowerShell.
2. Go to the project folder:

   ```powershell
   cd C:\Users\Administrator\Documents\GitHub\signcoach-hand-tracking
   ```

3. Install dependencies:

   ```powershell
   npm install
   ```

4. Start the dev server:

   ```powershell
   npm run dev
   ```

5. Open the local URL printed by Vite in a browser.

6. For a production build check:

   ```powershell
   npm run build
   ```

## Mobile testing notes

The Expo nail app can ask for camera permission through Expo Go because it is a native mobile runtime. SignCoach is browser-based, so phone camera access requires a secure browser context.

Camera access usually works on desktop `localhost`. Testing from a phone over the local network usually fails on `http://192.168...` because mobile browsers do not show camera permission prompts from insecure LAN URLs.

Recommended options if phone camera permission is blocked:

- Use the GitHub Pages deployment URL after the Pages workflow runs:

  ```text
  https://demianblack88.github.io/signcoach-hand-tracking/
  ```

- Use an HTTPS dev server.
- Use a trusted tunnel such as ngrok or Cloudflare Tunnel.
- Test first on desktop `localhost`, then verify on phone once a secure URL is available.

The app prefers the rear camera on mobile when the browser supports it. Use the Switch Camera button if the wrong camera opens.

If the phone still does not ask for permission, read the message shown in the camera panel. It reports whether the page is running in a secure context and whether the browser exposes `getUserMedia`.

## Development notes

The first version uses simple geometric rules instead of a trained model. Feedback should be read as practice guidance, not as proof that a handshape is correct.

Run unit tests with:

```powershell
npm test
```
