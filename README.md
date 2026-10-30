<div align="center">

```
 · · · · · · · · · · · · · · · ·
 · · ● ● ● ● · · · · · · · · · ·
 · · ● · · ● · · · · ● ● ● ● · ·
 · · ● ● ● ● · · · · ● · · ● · ·
 · · · · · · · · · · ● ● ● ● · ·
 · · · · · · · · · · · · · · · ·
```

# Origin

**Paint your pocket display, one dot at a time.**
Read off the pixel where every element starts. No more counting.

![Canvas](https://img.shields.io/badge/render-HTML%20canvas-0b6e6a?style=flat-square&labelColor=f3f6f8)
![Dependencies](https://img.shields.io/badge/dependencies-none-0b6e6a?style=flat-square&labelColor=f3f6f8)
![Default grid](https://img.shields.io/badge/default%20grid-240%C3%97135-0b6e6a?style=flat-square&labelColor=f3f6f8)
![Color](https://img.shields.io/badge/color-full%20RGB-0b6e6a?style=flat-square&labelColor=f3f6f8)

</div>

---

## Why this exists

Laying out a UI for a small display means choosing sizes and gaps by hand, and every element sitting under another one forces a round of arithmetic. Origin replaces that with a picture of the real screen. You draw the interface where you want it, and the tool tells you the numbers.

> One dot on the grid is one pixel on the display.

---

## What you get

| | |
|---|---|
| **Start x / Start y** | The leftmost column and topmost row an element occupies. This is the origin you pass to a draw call. |
| **Width / Height** | The extent of the painted dots, so spacing questions answer themselves. |
| **Live cursor** | The grid coordinate under the pointer, shown on the canvas and in the side panel. |
| **Layers** | Every named element is its own layer with its own start pixel, so overlap never costs you a measurement. |
| **Full color** | Eight swatches plus a custom picker. Each dot keeps its own color. |
| **Any display size** | Width and height are editable, from 8 to 480 on each side. |

---

## Getting started

There is nothing to install. The page and its scripts are static files.

```bash
cd display
python -m http.server 8765
```

Then open **http://127.0.0.1:8765/**.

Any static file server works. The scripts are browser modules, so open the page through that server. A browser will not load them from a `file://` address.

---

## A first session

1. **Set the screen.** Enter the width and height of your display under the title and press **Apply**. The default is 240×135.
2. **Name a piece.** Type `battery`, `clock`, `button`, and press **Add**. It becomes the active layer.
3. **Paint.** Use the pencil for single dots, the rectangle for solid blocks.
4. **Read the numbers.** The panel shows the piece's start x, start y, width and height.
5. **Stack.** Add a second piece over the first. Hide the top one to edit what is beneath it.
6. **Copy placements.** One click puts every piece's position on the clipboard.

---

## Tools

| Tool | Key | What it does |
|---|:---:|---|
| Pencil | `B` | Paints single dots into the active element. Drag to draw a continuous line. |
| Eraser | `E` | Removes dots from the active element only. |
| Rectangle | `R` | Drag to fill a solid block with the current color. |
| Circle | `C` | Press at the center, then drag out the radius. The readout gives `cx`, `cy`, and `r` for a filled-circle call. |
| Pan | `Space` | Hold and drag to move the grid. Middle mouse button also pans. |
| Fit | `F` | Scales and centers the whole grid in the window. |
| Zoom | wheel | Zooms toward the pointer, so a single dot stays easy to hit. |

Painting always goes into the selected element. Nothing is drawn until you have added one.

---

## Layers

The element list is ordered front to back, and the top of the list is drawn in front.

- **Select** an element by clicking its row. Its bounding box is outlined on the grid with a marker on the start dot.
- **Hide / Show** removes a layer from view without touching its dots.
- **Forward / Back** change the draw order.
- **Remove** asks for a second click before deleting.
- **Rename** by editing the name in place.

Each layer reports its own start pixel, so a button drawn underneath a panel keeps its own origin.

---

## Placements

**Copy placements** writes one line per element, front to back:

```text
battery  x=200  y=4  w=16  h=10
clock    x=88   y=52 w=64  h=24
dial     cx=120  cy=67  r=18  x=102  y=49  w=37  h=37
```

An element with no dots is listed as `(empty)`.

---

## Saving and loading

The design saves itself in your browser as you draw, including the grid size.

| Action | Result |
|---|---|
| **Download** | Saves `origin.json`. |
| **Load** | Reads an `origin.json`. The file's own size replaces the current one. |

The file looks like this:

```json
{
  "version": 1,
  "width": 240,
  "height": 135,
  "elements": [
    {
      "id": "…",
      "name": "battery",
      "visible": true,
      "x": 200, "y": 4, "w": 16, "h": 10,
      "pixels": { "200,4": "#0b6e6a" }
    }
  ]
}
```

`x`, `y`, `w` and `h` are derived from `pixels` for your convenience. Only `pixels` is the source of truth. Colors are six-digit hex.

---

## Changing the grid size

Enter a new **Width** and **Height** and press **Apply**.

- Each side must be a whole number from **8 to 480**.
- The grid can hold at most **160,000** dots in total.
- Growing the grid keeps every dot where it was.
- Shrinking it **removes dots past the new edge**, and the status line tells you when that happened.

---

## Under the hood

| Concern | Approach |
|---|---|
| **Rendering** | One canvas. The empty dot matrix and the painted dots are cached on two offscreen layers and only rebuilt when the zoom, size or content changes. |
| **Pointer mapping** | Pointer position is converted to a grid cell from the canvas box, pan and zoom, in CSS pixels, so high-DPI screens do not shift the dot you hit. |
| **Fast strokes** | Dragging fills in the cells between pointer events, so quick movements leave no gaps. |
| **Storage** | Each element holds a sparse map of `"x,y" → color`, so large empty grids cost nothing. |
| **Safety** | Loaded files are validated: size limits, hex colors and in-bounds coordinates. Bad entries are skipped. |

---

## Files

```
display/
├── index.html       page shell: grid, toolbar, element list, placement readout
├── styles.css       layout and the light bench theme, with a dark display stage
├── js/
│   ├── main.js      wires the page: tools, keys, save, load, startup
│   ├── session.js   shared state and the limits
│   ├── document.js  element geometry, placements, and file parsing
│   ├── history.js   undo and redo
│   ├── readouts.js  cursor, measurements, and the element list
│   ├── render.js    grid drawing
│   ├── paint.js     pencil, eraser, rectangle, circle, pan, and zoom
│   └── storage.js   browser save, grid resize, and loading a file
└── README.md        you are here
```

---

## Palette

| Swatch | Hex | Role |
|:---:|:---:|---|
| ![](https://img.shields.io/badge/-%20%20%20-dfe6ea?style=flat-square) | `#dfe6ea` | Bench background |
| ![](https://img.shields.io/badge/-%20%20%20-f3f6f8?style=flat-square) | `#f3f6f8` | Panels |
| ![](https://img.shields.io/badge/-%20%20%20-12181c?style=flat-square) | `#12181c` | Display stage |
| ![](https://img.shields.io/badge/-%20%20%20-3c4b56?style=flat-square) | `#3c4b56` | Empty dots |
| ![](https://img.shields.io/badge/-%20%20%20-0b6e6a?style=flat-square) | `#0b6e6a` | Accent |
| ![](https://img.shields.io/badge/-%20%20%20-3dccc7?style=flat-square) | `#3dccc7` | Selection on the stage |
| ![](https://img.shields.io/badge/-%20%20%20-172229?style=flat-square) | `#172229` | Text |

---

## Limits

- Output is placements and JSON. There is no firmware or C export yet.
- Elements are defined by their dots. Moving a piece means redrawing it.
- Undo is not implemented.

---

<div align="center">

<sub>Made for a pocket display. One dot, one pixel.</sub>

</div>
