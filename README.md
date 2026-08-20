# Batman Team Presentation Tour — Gotham 3D

A third-person **3D** browser experience built with Three.js for team presentations. Batman drives/walks through a night-time Gotham city block with a GTA-style chase camera, visits eight Batman-universe teammates at glowing checkpoint beacons, and displays each teammate's update in a speech bubble.

The game uses **original simplified low-poly avatars** built from Three.js primitives (capsules, cones, spheres, tori). They are inspired by each character's signature colors/silhouettes, but they are not copied from copyrighted comic or movie artwork.

## Features

- A continuous 3D Gotham city block: procedurally scattered buildings, glowing windows, a distant skyline, moonlight, and fog for depth
- Third-person **chase camera** that follows Batman like a GTA-style driving/walking tour
- **8 checkpoints / characters**, each marked with a colored beacon ring and light beam matching their palette
- Smooth point-to-point movement with **arrow keys, WASD, or click-to-move checkpoint beacons**
- Speech bubbles driven by **`data/dialogue.json`** so presentation content is editable without touching game code
- End screen with **restart/replay** support
- Static-site friendly setup for **GitHub Pages** — no build step, no bundler

## Project structure

- `/index.html` - page shell, HUD overlay markup, and Three.js entrypoint
- `/styles.css` - page layout, framing, and HUD/speech-bubble overlay styles
- `/js/game.js` - Three.js scene, city generation, camera, movement, and dialogue logic
- `/js/vendor/three.min.js` - vendored Three.js build (no external network required at runtime)
- `/data/dialogue.json` - editable checkpoint names and speech bubble messages

## Run locally

Because the game loads JSON, use a local web server instead of opening `index.html` directly from disk.

### Python 3

```bash
cd Batman
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Edit the presentation content

Update `data/dialogue.json` before each presentation.

Each checkpoint has:

```json
{
  "character": "Bane",
  "city": "Gotham Docks",
  "message": "Replace this with that teammate's latest update."
}
```

Guidelines:

- Keep the `character` names aligned with the existing eight characters unless you also update the avatar logic in `js/game.js`.
- Change `city` to any checkpoint label you want.
- Change `message` to the exact text you want shown in the speech bubble.
- Keep the checkpoints in the order you want Batman to visit them.

## Deploy to GitHub Pages

This repository is ready to deploy directly from the **root** of the default branch.

1. Push the branch you want to publish.
2. In GitHub, open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Choose the default branch and the **`/ (root)`** folder.
5. Save, then wait for GitHub Pages to publish the site.

## Swap in custom character art or models later

Right now, each character and building is drawn with simple Three.js geometry for a consistent original style. If you want to swap in custom 3D models later:

1. Add model files (for example glTF `.glb`) under an `assets/` folder.
2. Load them with `THREE.GLTFLoader` (add the loader script) inside `js/game.js`.
3. Replace the `buildCharacterAvatar(...)` group construction with the loaded model, keeping the same `position`/`rotation` usage so movement and the chase camera keep working.
4. Keep model scale roughly consistent with the existing capsule-based avatars (~3.5 world units tall) so the scene stays balanced.

## Notes

- Three.js is vendored locally in `js/vendor/three.min.js`, so the tour works fully offline and needs no build step.
- The implementation is intentionally lightweight so content updates stay easy before each demo.
