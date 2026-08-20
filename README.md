# Batman Team Presentation Tour

A 3D browser game built with **Three.js**. You play as Batman, driving or walking through three Gotham districts to collect presentation updates from 8 teammates. It's a plain static HTML/CSS/JS project — no build step, no backend, no live server logic. Just open it in a browser (through a local static file server, see below).

The Batman character, Batmobile, buildings, and bat-signal are **original simplified shapes** built from Three.js primitives (boxes, capsules, cones, etc.). They are inspired by Batman/Gotham's signature colors and silhouettes but are not copied from any copyrighted comic, movie, or game artwork.

## Features

- A real **3D scene** (Three.js) with a low-poly Gotham city spanning three districts
- **3 Gotham districts**: Wayne Plaza (hub/spawn), Arkham Square (northwest), Gotham Docks (southeast)
- Each district has 2–3 teammates positioned close together for quick on-foot conversations
- A **low-poly Batmobile** parked near spawn — enter/exit with **E** for fast inter-district travel
- **"Press E to talk"** prompt: an on-screen contextual prompt appears near teammates; press E to reveal their speech bubble
- **Progress tracker HUD** — a persistent panel listing all 8 teammates, with checkmarks as you collect each update
- Presentation content lives in **`data/dialogue.json`**, so you can edit it without touching any game code
- Gotham-inspired dark visual theme with a projector-friendly HUD
- Static-site friendly setup for **GitHub Pages**

## Project structure

- `/index.html` - page shell, HUD markup, progress tracker panel, and Three.js entrypoint
- `/styles.css` - page layout, framing, HUD styles, and progress tracker styles
- `/js/game.js` - Three.js scene setup, city/player/vehicle construction, movement, checkpoint logic, and progress tracking
- `/data/dialogue.json` - editable checkpoint character names, districts, positions, and speech bubble messages

## Run locally

Because the game loads JSON, use a local web server instead of opening `index.html` directly from disk.

### Python 3

```bash
cd Batman
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- **W / Up Arrow** — move forward (on foot or in vehicle)
- **S / Down Arrow** — move backward
- **A / Left Arrow** — turn left
- **D / Right Arrow** — turn right
- **E** — interact: enter/exit the Batmobile when near it, or talk to a teammate when near their marker
- Walk or drive near a glowing ring to see the "Press E to talk" prompt; press E to show their speech bubble and mark them as collected.

### Vehicle vs. on-foot

| Mode | Speed | Turning |
|------|-------|---------|
| On foot | Normal | Responsive |
| Batmobile | ~2.4× faster | Slower, weighted feel |

## 3-district layout

| District | Characters | World position |
|----------|------------|----------------|
| **Wayne Plaza** (spawn) | Batman, Robin, Harley Quinn | Center |
| **Arkham Square** | Joker, Scarecrow, Catwoman | Northwest |
| **Gotham Docks** | Bane, Arkham Knight | Southeast |

Walk between teammates within each district; use the Batmobile to travel between districts quickly.

## Edit the presentation content

Update `data/dialogue.json` before each presentation.

Each checkpoint entry has:

```json
{
  "character": "Bane",
  "city": "Gotham Docks",
  "district": "Gotham Docks",
  "x": 38,
  "z": 38,
  "message": "Replace this with that teammate's latest update."
}
```

Fields:

| Field | Purpose |
|-------|---------|
| `character` | Teammate name shown in the speech bubble header and progress tracker |
| `city` | Location label shown below the character name |
| `district` | Logical district grouping (informational, not used by game logic) |
| `x` / `z` | World position of this checkpoint marker (Three.js coordinates) |
| `message` | The speech bubble text shown when the player presses E |

Guidelines:

- Change `message` to the exact text you want shown in the speech bubble.
- Change `character`, `city`, and `district` as needed to match your team and venues.
- Adjust `x` / `z` to reposition a marker; keep teammates within the same district close together (within ~10 units of each other) so they're a short walk apart.
- The checkpoints can be in any order in the file — positions are read directly from the `x`/`z` fields.

## Progress tracker

The top-right HUD panel lists all teammates by name. Each name gains a gold checkmark the first time the player presses E to collect their update. On a live demo, this lets the audience see at a glance who's left to visit.

## Deploy to GitHub Pages

This repository is ready to deploy directly from the **root** of the default branch.

1. Push the branch you want to publish.
2. In GitHub, open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Choose the default branch and the **`/ (root)`** folder.
5. Save, then wait for GitHub Pages to publish the site.

## Notes

- Three.js is loaded from a CDN, so no build step is required.
- The implementation is intentionally lightweight so content updates stay easy before each demo.
- Vehicle driving uses tank-style turning: A/D turns, W/S thrusts forward/back.
