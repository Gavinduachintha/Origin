import { MIN_GRID, MAX_GRID, MAX_PIXELS } from "./session.js";

export function installDocument(app) {
  app.uid = function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  };

  app.activeElement = function activeElement() {
    return app.doc.elements.find((el) => el.id === app.doc.activeElementId) || null;
  };

  app.bounds = function bounds(el) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let n = 0;
    for (const key in el.pixels) {
      const comma = key.indexOf(",");
      const x = +key.slice(0, comma);
      const y = +key.slice(comma + 1);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      n += 1;
    }
    if (!n) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, n };
  };

  app.cleanName = function cleanName(value) {
    return String(value).replace(/\s+/g, " ").trim().slice(0, 40);
  };

  app.circleRadius = function circleRadius(a, b) {
    return Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) - 1e-6);
  };

  app.copyElements = function copyElements(elements) {
    return elements.map((el) => ({
      id: el.id,
      name: el.name,
      visible: el.visible,
      pixels: Object.assign({}, el.pixels),
      circle: el.circle ? { x: el.circle.x, y: el.circle.y, r: el.circle.r } : null,
    }));
  };

  app.exportDocument = function exportDocument() {
    return {
      version: 1,
      width: app.gridW,
      height: app.gridH,
      activeElementId: app.doc.activeElementId,
      elements: app.doc.elements.map((el) => {
        const box = app.bounds(el);
        const record = {
          id: el.id,
          name: el.name,
          visible: el.visible,
          x: box ? box.x : null,
          y: box ? box.y : null,
          w: box ? box.w : null,
          h: box ? box.h : null,
          pixels: el.pixels,
        };
        if (el.circle) {
          record.cx = el.circle.x;
          record.cy = el.circle.y;
          record.r = el.circle.r;
        }
        return record;
      }),
    };
  };

  app.sizeError = function sizeError(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      return "Width and height need to be whole numbers.";
    }
    if (width < MIN_GRID || height < MIN_GRID || width > MAX_GRID || height > MAX_GRID) {
      return "Width and height stay between " + MIN_GRID + " and " + MAX_GRID + ".";
    }
    if (width * height > MAX_PIXELS) return "That grid has too many dots to draw smoothly.";
    return "";
  };

  app.parseDocument = function parseDocument(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: "This file is not an Origin design." };
    }
    const width = Math.round(Number(data.width));
    const height = Math.round(Number(data.height));
    const invalid = app.sizeError(width, height);
    if (invalid) return { ok: false, error: invalid };
    if (!Array.isArray(data.elements)) {
      return { ok: false, error: "This file has no element list." };
    }
    const elements = [];
    const seen = new Set();
    for (const raw of data.elements) {
      if (!raw || typeof raw !== "object") continue;
      const name = app.cleanName(raw.name || "Element");
      if (!name) continue;
      const pixels = {};
      if (raw.pixels && typeof raw.pixels === "object") {
        for (const key in raw.pixels) {
          const match = /^(\d+),(\d+)$/.exec(key);
          if (!match) continue;
          const x = +match[1];
          const y = +match[2];
          if (x >= width || y >= height) continue;
          const fill = String(raw.pixels[key]).toLowerCase();
          if (!/^#[0-9a-f]{6}$/.test(fill)) continue;
          pixels[x + "," + y] = fill;
        }
      }
      let id = typeof raw.id === "string" && raw.id ? raw.id : app.uid();
      while (seen.has(id)) id = app.uid();
      seen.add(id);
      let circle = null;
      if (raw.cx != null && raw.cy != null && raw.r != null) {
        const cx = Math.round(Number(raw.cx));
        const cy = Math.round(Number(raw.cy));
        const radius = Math.round(Number(raw.r));
        if (
          Number.isInteger(cx) && Number.isInteger(cy) && Number.isInteger(radius) &&
          radius >= 0 && cx >= 0 && cy >= 0 && cx < width && cy < height
        ) {
          circle = { x: cx, y: cy, r: radius };
        }
      }
      elements.push({
        id,
        name,
        visible: raw.visible !== false,
        pixels,
        circle,
      });
    }
    let active = data.activeElementId;
    if (!elements.some((el) => el.id === active)) {
      active = elements.length ? elements[elements.length - 1].id : null;
    }
    return {
      ok: true,
      doc: { width, height, activeElementId: active, elements },
    };
  };

  app.clipToGrid = function clipToGrid(width, height) {
    let dropped = 0;
    for (const el of app.doc.elements) {
      let clipped = false;
      for (const key of Object.keys(el.pixels)) {
        const comma = key.indexOf(",");
        const x = +key.slice(0, comma);
        const y = +key.slice(comma + 1);
        if (x >= width || y >= height) {
          delete el.pixels[key];
          dropped += 1;
          clipped = true;
        }
      }
      if (clipped) el.circle = null;
    }
    return dropped;
  };

  app.placementLine = function placementLine(el) {
    const box = app.bounds(el);
    if (el.circle) {
      const circle = el.circle;
      const extent = box
        ? "  x=" + box.x + "  y=" + box.y + "  w=" + box.w + "  h=" + box.h
        : "";
      return el.name + "  cx=" + circle.x + "  cy=" + circle.y + "  r=" + circle.r + extent;
    }
    if (!box) return el.name + "  (empty)";
    return el.name + "  x=" + box.x + "  y=" + box.y + "  w=" + box.w + "  h=" + box.h;
  };

  app.placementBlock = function placementBlock() {
    if (!app.doc.elements.length) return "No elements yet.";
    return [...app.doc.elements].reverse().map(app.placementLine).join("\n");
  };
}
