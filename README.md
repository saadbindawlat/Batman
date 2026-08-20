# Batman Team Presentation Tour

A simple Phaser.js browser game for team presentations. Batman travels between Gotham-style checkpoints, meets seven Batman-universe teammates, and displays each teammate's update in a speech bubble.

The game uses **original simplified stylized avatars** built from Phaser shapes and text. They are inspired by each character's signature colors/silhouettes, but they are not copied from copyrighted comic or movie artwork.

## Features

- One continuous 2D presentation route with **8 checkpoints / characters**
- Smooth point-to-point movement with **arrow keys, WASD, or click-to-move checkpoints**
- Speech bubbles driven by **`data/dialogue.json`** so presentation content is editable without touching game code
- Gotham-inspired dark visual theme with clear, projector-friendly UI
- End screen with **restart/replay** support
- Static-site friendly setup for **GitHub Pages**

## Project structure

- `/index.html` - page shell and Phaser entrypoint
- `/styles.css` - page layout and framing styles
- `/js/game.js` - Phaser scene and character drawing logic
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

- Keep the `character` names aligned with the existing eight characters unless you also update the art logic in `js/game.js`.
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

## Swap in custom character art later

Right now, each character is drawn in code for a consistent original style. If you want to replace those with custom PNG sprites later:

1. Add image files such as `assets/characters/batman.png`, `assets/characters/bane.png`, etc.
2. Load them in the Phaser `preload()` method inside `js/game.js`.
3. Replace the `buildCharacterAvatar(...)` calls with `this.add.image(...)` or `this.add.sprite(...)` using the matching filenames.
4. Keep image sizes roughly consistent so the scene stays balanced.

## Notes

- Phaser is loaded from a CDN, so no build step is required.
- The implementation is intentionally lightweight so content updates stay easy before each demo.
