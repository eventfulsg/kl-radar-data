# Zouk Pre-Drink Package — launch carousel

Two-slide Instagram carousel (1080×1350, 4:5) based on the Mr. Patty
"cheese pour" carousel: slide 1 is a looping video of vodka pouring from
the bottle down "through" the post onto the mascot's face; slide 2 is the
offer card.

- `slide1-video.mp4` — 5s seamless loop, 30fps, H.264, silent (add a
  trending sound in the IG composer).
- `slide2-image.png` — static offer card.

Placeholders to confirm before posting: price (`$88`), inclusions
(vodka 700ml / mixers / ice + setup / express entry), caption text in the
fake feed strip.

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
