# Image asset sources

This directory holds the HTML source files for the visual assets used in
the project README. Each source renders to a single PNG in `../img/`.

## Editing an asset

1. Edit the relevant `.html` file (open in browser to preview).
2. Re-render:

   ```bash
   # From repo root, first time only:
   npm install --no-save puppeteer

   node docs/img-src/render.mjs
   ```

3. Commit both the `.html` change and the regenerated `.png`.

## Output dimensions

| Source                       | PNG output                  | Display size |
|------------------------------|-----------------------------|--------------|
| `hero-before-after.html`     | `../img/hero-before-after.png` | 830×280  |
| `how-it-works.html`          | `../img/how-it-works.png`      | 840×260  |

PNGs are rendered at deviceScaleFactor 2 (so the actual pixel dimensions
are double the table above) for retina-quality display on GitHub.
