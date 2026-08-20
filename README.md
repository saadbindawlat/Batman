# Batman Team Presentation Tour

A simple 3D browser game built with **Three.js**. You drive a low-poly Batman
character around a small Gotham city block and walk up to glowing checkpoints
to read each teammate's presentation update. It's a plain static HTML/CSS/JS
project — no build step, no backend, no live server logic. Just open it in a
browser (through a local static file server, see below).

The Batman character, buildings, and bat-signal are **original simplified
shapes** built from Three.js primitives (boxes, capsules, cones, etc.). They
are inspired by Batman/Gotham's signature colors and silhouettes but are not
copied from any copyrighted comic, movie, or game artwork.

## Features

- A real **3D scene** (Three.js) with a low-poly Gotham city block: roads,
  buildings with lit windows, and a bat-signal beacon
- A 3D Batman player character you drive around with **WASD or arrow keys**
- Smooth **third-person follow camera**
- **8 glowing checkpoints** around the city, one per teammate; walking into a
  checkpoint's ring shows that teammate's update in an on-screen speech bubble
- Presentation content lives in **`data/dialogue.json`**, so you can edit it
  without touching any game code
- Gotham-inspired dark visual theme with a projector-friendly HUD
- Static-site friendly setup for **GitHub Pages**

## Project structure

- `/index.html` - page shell, HUD markup, and Three.js entrypoint
- `/styles.css` - page layout, framing, and HUD styles
- `/js/game.js` - Three.js scene setup, city/player construction, movement, and checkpoint logic
- `/data/dialogue.json` - editable checkpoint names and speech bubble messages

## Run locally

Because the game loads JSON, use a local web server instead of opening `index.html` directly from disk.

### Python 3

```bash
cd Batman
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- **W / Up Arrow** - move forward
- **S / Down Arrow** - move backward
- **A / Left Arrow** - move left
- **D / Right Arrow** - move right
- Walk into a glowing ring on the ground to trigger that checkpoint's speech bubble.

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

- Keep the checkpoints in the same order as their markers in `js/game.js`
  (`CHECKPOINT_POSITIONS`), since checkpoints are matched by index.
- Change `city` to any checkpoint label you want.
- Change `message` to the exact text you want shown in the speech bubble.

## Deploy to GitHub Pages

This repository is ready to deploy directly from the **root** of the default branch.

1. Push the branch you want to publish.
2. In GitHub, open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Choose the default branch and the **`/ (root)`** folder.
5. Save, then wait for GitHub Pages to publish the site.

## Add or move checkpoints later

1. Add or edit an entry in `CHECKPOINT_POSITIONS` inside `js/game.js` to place a new marker (x/z world coordinates).
2. Add a matching checkpoint object (same array index) to `data/dialogue.json`.
3. Keep the two lists the same length and order so each marker shows the right message.

## Notes

- Three.js is loaded from a CDN, so no build step is required.
- The implementation is intentionally lightweight so content updates stay easy before each demo.
