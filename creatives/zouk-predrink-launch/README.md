# Zouk Pre-Drink Package — launch carousel

Two-slide Instagram carousel (1080×1350, 4:5) based on the Mr. Patty
"cheese pour" carousel: slide 1 is a looping video of vodka pouring from
the bottle down "through" the post onto the mascot's face; slide 2 is the
offer card.

- `slide1-video.mp4` — 5s seamless loop, 30fps, H.264, silent (add a
  trending sound in the IG composer).
- `slide2-image.png` — static offer card.

Palette: Eventful orange `#F26F21` on cream `#F3EADB`, accents `#C93D6E`.
All facts sourced from the drop-002 mockup (eventful-drops repo,
`preview-478585c2da19/drop-002.html`): $129 (worth ~$268), 2× Sorry For:
bottles (Sour Plum Vodka / Chrysanthemum Peach Gin), 4× Zouk entries,
party cups, shot glasses for the first 10 orders, only 10 packs, free
next-day delivery, 18+. Bottle imagery is the real product photography
(`bottle_open.png` cutout from `drop004-bottles.jpg`).

## Rebuilding

`src/` contains the SVG/HTML sources and the frame renderer. Each slide is
deterministic — slide 1 exposes `window.seek(t)` so every frame is
reproducible.

```
pip install playwright imageio-ffmpeg
python src/render.py slide1.html video     # writes vframes/f_*.png
ffmpeg -framerate 30 -i vframes/f_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 slide1-video.mp4
python src/render.py slide2.html still 0 slide2-image.png
```

Font: Baloo 2 (SIL Open Font License), bundled in `src/`.
