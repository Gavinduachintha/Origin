# Origin showcase

An 84-second launch film for Origin, the pocket-display dot grid. The application itself stays vanilla HTML, CSS, and JavaScript. This folder is only the film.

## What the film shows

Only behavior that exists in Origin:

- A 240×135 dot grid, later resized to 160×90 with Apply.
- Named elements, painted with the rectangle tool.
- Start x, start y, width, and height. Start is the top-left painted dot.
- A second element drawn in front, then hidden. The element underneath keeps its own start.
- Copy placements, in the same `name  x=  y=  w=  h=` lines the app writes, front to back.

The dot field is a zoomed close-up of the real coordinate system. The header keeps the actual grid size. Battery is painted at x=6, y=8, 16×9. Clock is painted at x=16, y=5, 12×8, overlapping the battery.

## Architecture

- Remotion owns the timeline, the edit, and the H.264 render.
- The opening is a real Three.js scene (`@remotion/three`): a side-angle camera moves through fog, dust, and a few floating panels.
- The interface assembles in a CSS perspective camera so the type stays sharp. Panels arrive from depth, above, and the side, then the camera orbits to a frontal view.
- The feature scenes are a directed reconstruction of Origin’s layout and rules, not a screen recording. A browser capture cannot assemble in 3D, and a flat recording was the thing this film replaces.
- Narration is generated with a Microsoft neural voice (edge-tts) for this film. The bed, whooshes, and impacts are synthesized in `scripts/make_audio.py`. No commercial music.

## Scenes

| Time | Frames | Scene |
| --- | --- | --- |
| 0:00–0:14 | 0–420 | Dark 3D opening. Side camera tracks in. Title: Pocket display / Origin. |
| 0:13–0:38 | 380–1160 | Grid, header, tools, readout, elements, and placements assemble. Camera orbits toward the front. |
| 0:38–0:43 | 1160–1280 | Push-in. Perspective settles to a straight-on interface. |
| 0:43–1:16 | 1280–2300 | Name battery, paint it, read the start pixel, paint clock on top, hide clock, resize to 160×90, copy placements. |
| 1:16–1:24 | 2300–2520 | Pull back to a three-quarter view. Panels separate slightly. End card with the product name. |

Narration:

1. “Origin. Design a pocket display, one pixel at a time.”
2. “Navigation, the grid, and the placement readout take their places.”
3. “Name a piece, then paint its dots. Start is the top-left painted dot.”
4. “Draw the next piece on top. Hide it, and the one underneath keeps its own start.”
5. “Set the width and height of the display, then copy the placements.”
6. “Origin.”

## Render

From this directory:

```bash
python scripts/make_audio.py
npm run preview
npm run showcase
```

`preview` writes `out/preview.mp4` at half resolution. `showcase` writes `out/origin-showcase.mp4` at 1920×1080, 30 fps, H.264, with AAC audio.

Open the timeline in Remotion Studio:

```bash
npm run studio
```

Choose the `OriginShowcase` composition. The earlier `Origin` composition is the short silent cut and is left in place.
