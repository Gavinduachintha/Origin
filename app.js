(() => {
  "use strict";

  const GRID_W = 240;
  const GRID_H = 135;
  const STORAGE_KEY = "display-dot-grid-v1";
  const SWATCHES = ["#f4f1e8", "#c6f135", "#ffb020", "#ff5a36", "#3ec1ff", "#7aa2ff", "#1a1a1a", "#8d9a86"];

  const stage = document.querySelector("#stage");
  const canvas = document.querySelector("#grid");
  const ctx = canvas.getContext("2d");
  const hint = document.querySelector("#hint");
  const floatCursor = document.querySelector("#float-cursor");
  const list = document.querySelector("#element-list");
  const addForm = document.querySelector("#add-form");
  const newName = document.querySelector("#new-name");
  const colorInput = document.querySelector("#color");
  const swatchBox = document.querySelector("#swatches");
  const placementText = document.querySelector("#placement-text");
  const status = document.querySelector("#status");
  const cursorX = document.querySelector("#cursor-x");
  const cursorY = document.querySelector("#cursor-y");
  const activeName = document.querySelector("#active-name");
  const startX = document.querySelector("#start-x");
  const startY = document.querySelector("#start-y");
  const sizeW = document.querySelector("#size-w");
  const sizeH = document.querySelector("#size-h");
  const dotCount = document.querySelector("#dot-count");
  const toolButtons = [...document.querySelectorAll("[data-tool]")];

  let cell = 4;
  let panX = 0;
  let panY = 0;
  let tool = "pencil";
  let color = colorInput.value;
  let hover = null;
  let spaceHeld = false;
  let panning = false;
  let painting = false;
  let panOrigin = null;
  let lastCell = null;
  let rectAnchor = null;
  let rectCurrent = null;
  let edited = false;
  let userMoved = false;
  let drawScheduled = false;
  let readoutScheduled = false;
  let persistTimer = 0;
  let statusTimer = 0;
  let lastViewW = 0;
  let lastViewH = 0;
  let wheelBag = 0;

  let gridLayer = null;
  let paintLayer = null;
  let layerCell = 0;
  let layerScaleValue = 0;
  let gridDirty = true;
  let paintDirty = true;

  let doc = {
    width: GRID_W,
    height: GRID_H,
    activeElementId: null,
    elements: [],
  };

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function activeElement() {
    return doc.elements.find((el) => el.id === doc.activeElementId) || null;
  }

  function bounds(el) {
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
  }

  function cleanName(value) {
    return String(value).replace(/\s+/g, " ").trim().slice(0, 40);
  }

  function dotRadius() {
    const gap = cell >= 6 ? 2 : cell >= 3 ? 1 : 0;
    return Math.max(0.5, (cell - gap) / 2);
  }

  function layerScale(dpr) {
    const maxW = 4096 / (GRID_W * cell);
    const maxH = 4096 / (GRID_H * cell);
    return Math.min(dpr, maxW, maxH);
  }

  function showStatus(message) {
    status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.textContent = "";
    }, 2800);
  }

  function setColor(next) {
    color = next;
    colorInput.value = next;
    for (const button of swatchBox.children) {
      button.classList.toggle("is-on", button.dataset.color === next.toLowerCase());
    }
  }

  function setTool(next) {
    tool = next;
    canvas.dataset.tool = next;
    for (const button of toolButtons) {
      const on = button.dataset.tool === next;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  function updateHint() {
    hint.hidden = doc.elements.length > 0;
  }

  function renderCursor() {
    const x = hover ? String(hover.x) : "—";
    const y = hover ? String(hover.y) : "—";
    cursorX.textContent = x;
    cursorY.textContent = y;
    floatCursor.textContent = "x " + x + "    y " + y;
  }

  function renderPlacement() {
    const el = activeElement();
    if (!el) {
      activeName.textContent = "No element";
      startX.textContent = "—";
      startY.textContent = "—";
      sizeW.textContent = "—";
      sizeH.textContent = "—";
      dotCount.textContent = "Add an element, then paint its dots. Start is the top-left painted dot.";
      return;
    }
    activeName.textContent = el.name;
    const box = bounds(el);
    if (!box) {
      startX.textContent = "—";
      startY.textContent = "—";
      sizeW.textContent = "—";
      sizeH.textContent = "—";
      dotCount.textContent = "No dots yet. Start is the top-left painted dot.";
      return;
    }
    startX.textContent = String(box.x);
    startY.textContent = String(box.y);
    sizeW.textContent = String(box.w);
    sizeH.textContent = String(box.h);
    const noun = box.n === 1 ? " dot. " : " dots. ";
    dotCount.textContent = box.n + noun + "Start is the top-left painted dot.";
  }

  function placementBlock() {
    if (!doc.elements.length) return "No elements yet.";
    return [...doc.elements].reverse().map((el) => {
      const box = bounds(el);
      if (!box) return el.name + "  (empty)";
      return el.name + "  x=" + box.x + "  y=" + box.y + "  w=" + box.w + "  h=" + box.h;
    }).join("\n");
  }

  function updateListMeta() {
    for (const row of list.querySelectorAll(".element")) {
      const el = doc.elements.find((item) => item.id === row.dataset.id);
      const meta = row.querySelector(".meta");
      if (!el || !meta) continue;
      const box = bounds(el);
      meta.textContent = box
        ? "x=" + box.x + "  y=" + box.y + "  ·  " + box.w + "×" + box.h
        : "empty";
    }
  }

  function refreshReadouts() {
    renderPlacement();
    updateListMeta();
    const text = placementBlock();
    if (placementText.textContent !== text) placementText.textContent = text;
  }

  function scheduleReadouts() {
    if (readoutScheduled) return;
    readoutScheduled = true;
    requestAnimationFrame(() => {
      readoutScheduled = false;
      refreshReadouts();
    });
  }

  function renderList() {
    list.replaceChildren();
    updateHint();
    if (!doc.elements.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No elements yet.";
      list.append(empty);
      refreshReadouts();
      return;
    }

    const frontFirst = [...doc.elements].reverse();
    for (const el of frontFirst) {
      const index = doc.elements.findIndex((item) => item.id === el.id);
      const row = document.createElement("li");
      row.className = "element" + (el.id === doc.activeElementId ? " is-active" : "") + (el.visible ? "" : " is-hidden");
      row.dataset.id = el.id;

      const top = document.createElement("div");
      top.className = "element-top";

      const hide = document.createElement("button");
      hide.type = "button";
      hide.dataset.action = "hide";
      hide.textContent = el.visible ? "Hide" : "Show";
      hide.setAttribute("aria-label", (el.visible ? "Hide " : "Show ") + el.name);

      const name = document.createElement("input");
      name.className = "name";
      name.value = el.name;
      name.maxLength = 40;
      name.autocomplete = "off";
      name.spellcheck = false;
      name.setAttribute("aria-label", "Element name");

      const meta = document.createElement("p");
      meta.className = "meta";

      const actions = document.createElement("div");
      actions.className = "actions";

      const forward = document.createElement("button");
      forward.type = "button";
      forward.dataset.action = "forward";
      forward.textContent = "Forward";
      forward.title = "Draw this element in front";
      forward.disabled = index === doc.elements.length - 1;

      const back = document.createElement("button");
      back.type = "button";
      back.dataset.action = "back";
      back.textContent = "Back";
      back.title = "Draw this element behind";
      back.disabled = index === 0;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "remove";
      remove.className = "remove";
      remove.textContent = "Remove";

      top.append(hide, name);
      actions.append(forward, back, remove);
      row.append(top, meta, actions);
      list.append(row);
    }
    refreshReadouts();
  }

  function markActiveRows() {
    for (const row of list.querySelectorAll(".element")) {
      row.classList.toggle("is-active", row.dataset.id === doc.activeElementId);
    }
  }

  function exportDocument() {
    return {
      version: 1,
      width: GRID_W,
      height: GRID_H,
      activeElementId: doc.activeElementId,
      elements: doc.elements.map((el) => {
        const box = bounds(el);
        return {
          id: el.id,
          name: el.name,
          visible: el.visible,
          x: box ? box.x : null,
          y: box ? box.y : null,
          w: box ? box.w : null,
          h: box ? box.h : null,
          pixels: el.pixels,
        };
      }),
    };
  }

  function parseDocument(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: "This file is not a dot grid." };
    }
    if (data.width !== GRID_W || data.height !== GRID_H) {
      return { ok: false, error: "This grid is not 240×135." };
    }
    if (!Array.isArray(data.elements)) {
      return { ok: false, error: "This file has no element list." };
    }
    const elements = [];
    const seen = new Set();
    for (const raw of data.elements) {
      if (!raw || typeof raw !== "object") continue;
      const name = cleanName(raw.name || "Element");
      if (!name) continue;
      const pixels = {};
      if (raw.pixels && typeof raw.pixels === "object") {
        for (const key in raw.pixels) {
          const match = /^(\d+),(\d+)$/.exec(key);
          if (!match) continue;
          const x = +match[1];
          const y = +match[2];
          if (x >= GRID_W || y >= GRID_H) continue;
          const fill = String(raw.pixels[key]).toLowerCase();
          if (!/^#[0-9a-f]{6}$/.test(fill)) continue;
          pixels[x + "," + y] = fill;
        }
      }
      let id = typeof raw.id === "string" && raw.id ? raw.id : uid();
      while (seen.has(id)) id = uid();
      seen.add(id);
      elements.push({
        id,
        name,
        visible: raw.visible !== false,
        pixels,
      });
    }
    let active = data.activeElementId;
    if (!elements.some((el) => el.id === active)) {
      active = elements.length ? elements[elements.length - 1].id : null;
    }
    return {
      ok: true,
      doc: { width: GRID_W, height: GRID_H, activeElementId: active, elements },
    };
  }

  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exportDocument()));
      } catch {
        showStatus("Could not save in this browser.");
      }
    }, 120);
  }

  function fit() {
    const rect = stage.getBoundingClientRect();
    const margin = 28;
    const next = Math.floor(Math.min((rect.width - margin) / GRID_W, (rect.height - margin) / GRID_H));
    cell = Math.max(2, Math.min(18, next || 2));
    panX = Math.round((rect.width - GRID_W * cell) / 2);
    panY = Math.round((rect.height - GRID_H * cell) / 2);
  }

  function syncLayers(dpr) {
    const scale = layerScale(dpr);
    if (gridLayer && layerCell === cell && layerScaleValue === scale) return;
    layerCell = cell;
    layerScaleValue = scale;
    const width = Math.max(1, Math.ceil(GRID_W * cell * scale));
    const height = Math.max(1, Math.ceil(GRID_H * cell * scale));
    gridLayer = document.createElement("canvas");
    paintLayer = document.createElement("canvas");
    gridLayer.width = width;
    gridLayer.height = height;
    paintLayer.width = width;
    paintLayer.height = height;
    gridDirty = true;
    paintDirty = true;
  }

  function traceDots(context, keys) {
    const radius = dotRadius();
    const chunk = 4000;
    for (let start = 0; start < keys.length; start += chunk) {
      context.beginPath();
      const end = Math.min(keys.length, start + chunk);
      for (let i = start; i < end; i += 1) {
        const key = keys[i];
        const comma = key.indexOf(",");
        const x = +key.slice(0, comma);
        const y = +key.slice(comma + 1);
        const cx = x * cell + cell / 2;
        const cy = y * cell + cell / 2;
        context.moveTo(cx + radius, cy);
        context.arc(cx, cy, radius, 0, Math.PI * 2);
      }
      context.fill();
    }
  }

  function rebuildGrid() {
    const g = gridLayer.getContext("2d");
    g.setTransform(layerScaleValue, 0, 0, layerScaleValue, 0, 0);
    g.clearRect(0, 0, GRID_W * cell, GRID_H * cell);
    g.fillStyle = "#314033";
    const radius = dotRadius();
    const chunk = 4000;
    let n = 0;
    g.beginPath();
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        const cx = x * cell + cell / 2;
        const cy = y * cell + cell / 2;
        g.moveTo(cx + radius, cy);
        g.arc(cx, cy, radius, 0, Math.PI * 2);
        n += 1;
        if (n === chunk) {
          g.fill();
          g.beginPath();
          n = 0;
        }
      }
    }
    if (n) g.fill();
    gridDirty = false;
  }

  function rebuildPaint() {
    const g = paintLayer.getContext("2d");
    g.setTransform(layerScaleValue, 0, 0, layerScaleValue, 0, 0);
    g.clearRect(0, 0, GRID_W * cell, GRID_H * cell);
    for (const el of doc.elements) {
      if (!el.visible) continue;
      const byColor = new Map();
      for (const key in el.pixels) {
        const fill = el.pixels[key];
        let bucket = byColor.get(fill);
        if (!bucket) {
          bucket = [];
          byColor.set(fill, bucket);
        }
        bucket.push(key);
      }
      for (const [fill, keys] of byColor) {
        g.fillStyle = fill;
        traceDots(g, keys);
      }
    }
    paintDirty = false;
  }

  function restampCell(x, y) {
    if (!paintLayer || paintDirty) return;
    const g = paintLayer.getContext("2d");
    const radius = dotRadius();
    const cx = x * cell + cell / 2;
    const cy = y * cell + cell / 2;
    g.setTransform(layerScaleValue, 0, 0, layerScaleValue, 0, 0);
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(cx, cy, radius + 0.75, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = "source-over";
    for (const el of doc.elements) {
      if (!el.visible) continue;
      const fill = el.pixels[x + "," + y];
      if (!fill) continue;
      g.fillStyle = fill;
      g.beginPath();
      g.arc(cx, cy, radius, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawOverlay() {
    if (rectAnchor && rectCurrent) {
      const x0 = Math.min(rectAnchor.x, rectCurrent.x);
      const x1 = Math.max(rectAnchor.x, rectCurrent.x);
      const y0 = Math.min(rectAnchor.y, rectCurrent.y);
      const y1 = Math.max(rectAnchor.y, rectCurrent.y);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      ctx.fillRect(panX + x0 * cell, panY + y0 * cell, (x1 - x0 + 1) * cell, (y1 - y0 + 1) * cell);
      ctx.restore();
    }

    if (hover) {
      ctx.strokeStyle = "#f4f1e8";
      ctx.lineWidth = 1;
      ctx.strokeRect(panX + hover.x * cell + 0.5, panY + hover.y * cell + 0.5, cell - 1, cell - 1);
    }

    const el = activeElement();
    if (!el) return;
    const box = bounds(el);
    if (!box) return;
    ctx.save();
    ctx.strokeStyle = "#c6f135";
    ctx.lineWidth = 1;
    ctx.setLineDash(el.visible ? [] : [4, 3]);
    ctx.strokeRect(
      panX + box.x * cell + 0.5,
      panY + box.y * cell + 0.5,
      box.w * cell - 1,
      box.h * cell - 1
    );
    ctx.setLineDash([]);
    ctx.fillStyle = "#c6f135";
    const mark = Math.max(3, Math.round(cell * 0.28));
    ctx.fillRect(panX + box.x * cell, panY + box.y * cell, mark, mark);
    ctx.restore();
  }

  function draw() {
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    syncLayers(dpr);
    if (gridDirty) rebuildGrid();
    if (paintDirty) rebuildPaint();
    ctx.fillStyle = "#0b0e0b";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.imageSmoothingEnabled = false;
    const dw = GRID_W * cell;
    const dh = GRID_H * cell;
    ctx.drawImage(gridLayer, panX, panY, dw, dh);
    ctx.drawImage(paintLayer, panX, panY, dw, dh);
    drawOverlay();
    renderCursor();
  }

  function scheduleDraw() {
    if (drawScheduled) return;
    drawScheduled = true;
    requestAnimationFrame(() => {
      drawScheduled = false;
      draw();
    });
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const sizeChanged = w !== lastViewW || h !== lastViewH;
    lastViewW = w;
    lastViewH = h;
    if (sizeChanged && !userMoved && w > 80 && h > 80) fit();
    scheduleDraw();
  }

  // Pointer position is in CSS pixels. pan and cell live in that same space,
  // so a resized backing store (devicePixelRatio) must not be applied here.
  function cellFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - panX) / cell);
    const y = Math.floor((event.clientY - rect.top - panY) / cell);
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return null;
    return { x, y };
  }

  function paintAt(x, y) {
    const el = activeElement();
    if (!el) return false;
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false;
    const key = x + "," + y;
    if (tool === "eraser") {
      if (!(key in el.pixels)) return false;
      delete el.pixels[key];
    } else if (el.pixels[key] === color) {
      return false;
    } else {
      el.pixels[key] = color;
    }
    restampCell(x, y);
    return true;
  }

  function forEachCellOnLine(a, b, fn) {
    let x0 = a.x;
    let y0 = a.y;
    const x1 = b.x;
    const y1 = b.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      fn(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const doubled = err * 2;
      if (doubled > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (doubled < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  function commitRect(a, b) {
    const el = activeElement();
    if (!el) return;
    const x0 = Math.max(0, Math.min(a.x, b.x));
    const x1 = Math.min(GRID_W - 1, Math.max(a.x, b.x));
    const y0 = Math.max(0, Math.min(a.y, b.y));
    const y1 = Math.min(GRID_H - 1, Math.max(a.y, b.y));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) el.pixels[x + "," + y] = color;
    }
    paintDirty = true;
    edited = true;
  }

  function endPointer() {
    const anchor = rectAnchor;
    const current = rectCurrent;
    const wasPainting = painting;
    rectAnchor = null;
    rectCurrent = null;
    painting = false;
    panning = false;
    panOrigin = null;
    lastCell = null;
    stage.classList.remove("is-grabbing");
    if (anchor && current && tool === "rect") commitRect(anchor, current);
    if (edited || (anchor && current && tool === "rect")) {
      edited = false;
      persist();
      scheduleReadouts();
    } else if (wasPainting) {
      scheduleReadouts();
    }
    scheduleDraw();
  }

  function onPointerDown(event) {
    if (event.button === 2) return;
    event.preventDefault();
    const wantsPan = event.button === 1 || tool === "pan" || spaceHeld;
    if (wantsPan) {
      panning = true;
      userMoved = true;
      panOrigin = { x: event.clientX, y: event.clientY, panX, panY };
      stage.classList.add("is-grabbing");
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    const pos = cellFromEvent(event);
    hover = pos;
    renderCursor();
    if (!pos) return;
    if (!activeElement()) {
      showStatus("Add an element before painting.");
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    if (tool === "rect") {
      rectAnchor = pos;
      rectCurrent = pos;
      scheduleDraw();
      return;
    }
    painting = true;
    lastCell = pos;
    if (paintAt(pos.x, pos.y)) edited = true;
    scheduleDraw();
    scheduleReadouts();
  }

  function onPointerMove(event) {
    const pos = cellFromEvent(event);
    const hoverChanged = !hover || !pos || hover.x !== pos.x || hover.y !== pos.y;
    if (hoverChanged) {
      hover = pos;
      renderCursor();
    }
    if (panning && panOrigin) {
      panX = Math.round(panOrigin.panX + (event.clientX - panOrigin.x));
      panY = Math.round(panOrigin.panY + (event.clientY - panOrigin.y));
      userMoved = true;
      scheduleDraw();
      return;
    }
    if (tool === "rect" && rectAnchor) {
      if (pos) rectCurrent = pos;
      scheduleDraw();
      return;
    }
    if (painting && pos && lastCell) {
      forEachCellOnLine(lastCell, pos, (x, y) => {
        if (paintAt(x, y)) edited = true;
      });
      lastCell = pos;
      scheduleDraw();
      scheduleReadouts();
      return;
    }
    if (painting && pos) {
      lastCell = pos;
      if (paintAt(pos.x, pos.y)) edited = true;
      scheduleDraw();
      scheduleReadouts();
      return;
    }
    if (painting && !pos) lastCell = null;
    if (hoverChanged) scheduleDraw();
  }

  function zoomAt(clientX, clientY, direction) {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const gridX = (mx - panX) / cell;
    const gridY = (my - panY) / cell;
    const next = Math.min(18, Math.max(2, cell + direction));
    if (next === cell) return;
    cell = next;
    panX = Math.round(mx - gridX * cell);
    panY = Math.round(my - gridY * cell);
    userMoved = true;
    scheduleDraw();
  }

  function selectElement(id) {
    doc.activeElementId = id;
    markActiveRows();
    renderPlacement();
    persist();
    scheduleDraw();
  }

  function moveElement(id, delta) {
    const index = doc.elements.findIndex((item) => item.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= doc.elements.length) return;
    const [el] = doc.elements.splice(index, 1);
    doc.elements.splice(next, 0, el);
    doc.activeElementId = id;
    paintDirty = true;
    persist();
    renderList();
    scheduleDraw();
  }

  function toggleVisible(id) {
    const el = doc.elements.find((item) => item.id === id);
    if (!el) return;
    el.visible = !el.visible;
    doc.activeElementId = id;
    paintDirty = true;
    persist();
    renderList();
    scheduleDraw();
  }

  function removeElement(id) {
    doc.elements = doc.elements.filter((item) => item.id !== id);
    if (doc.activeElementId === id) {
      doc.activeElementId = doc.elements.length ? doc.elements[doc.elements.length - 1].id : null;
    }
    paintDirty = true;
    persist();
    renderList();
    scheduleDraw();
  }

  function applyLoaded(next, message) {
    doc = next;
    paintDirty = true;
    userMoved = false;
    fit();
    renderList();
    persist();
    scheduleDraw();
    showStatus(message);
  }

  for (const swatch of SWATCHES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.dataset.color = swatch;
    button.style.background = swatch;
    button.title = swatch;
    button.setAttribute("aria-label", "Color " + swatch);
    button.addEventListener("click", () => setColor(swatch));
    swatchBox.append(button);
  }

  colorInput.addEventListener("input", () => setColor(colorInput.value));
  setColor(color);

  for (const button of toolButtons) {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  }
  setTool("pencil");

  document.querySelector("#fit").addEventListener("click", () => {
    userMoved = false;
    fit();
    scheduleDraw();
  });

  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = cleanName(newName.value);
    if (!name) return;
    const el = { id: uid(), name, visible: true, pixels: {} };
    doc.elements.push(el);
    doc.activeElementId = el.id;
    newName.value = "";
    persist();
    renderList();
    scheduleDraw();
    newName.focus();
  });

  list.addEventListener("click", (event) => {
    const row = event.target.closest(".element");
    if (!row) return;
    const id = row.dataset.id;
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      selectElement(id);
      return;
    }
    if (action === "hide") toggleVisible(id);
    else if (action === "forward") moveElement(id, 1);
    else if (action === "back") moveElement(id, -1);
    else if (action === "remove") {
      const button = event.target.closest("[data-action]");
      if (button.dataset.confirm !== "1") {
        button.dataset.confirm = "1";
        button.textContent = "Confirm";
        setTimeout(() => {
          if (!button.isConnected) return;
          button.dataset.confirm = "";
          button.textContent = "Remove";
        }, 2000);
        return;
      }
      removeElement(id);
    }
  });

  list.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.classList.contains("name")) event.target.blur();
  });

  list.addEventListener("change", (event) => {
    if (!event.target.classList.contains("name")) return;
    const row = event.target.closest(".element");
    const el = doc.elements.find((item) => item.id === row.dataset.id);
    if (!el) return;
    const name = cleanName(event.target.value);
    if (!name) {
      event.target.value = el.name;
      return;
    }
    el.name = name;
    event.target.value = name;
    const hide = row.querySelector("[data-action='hide']");
    if (hide) hide.setAttribute("aria-label", (el.visible ? "Hide " : "Show ") + el.name);
    persist();
    refreshReadouts();
  });

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("lostpointercapture", endPointer);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerleave", () => {
    if (painting || rectAnchor || panning) return;
    hover = null;
    renderCursor();
    scheduleDraw();
  });

  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    wheelBag += event.deltaY;
    if (Math.abs(wheelBag) < 40) return;
    const direction = wheelBag > 0 ? -1 : 1;
    wheelBag = 0;
    zoomAt(event.clientX, event.clientY, direction);
  }, { passive: false });

  window.addEventListener("keydown", (event) => {
    if (event.target.closest("input, textarea")) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) {
        spaceHeld = true;
        stage.classList.add("is-panning");
      }
      return;
    }
    const next = { b: "pencil", e: "eraser", r: "rect", h: "pan" }[event.key.toLowerCase()];
    if (next) setTool(next);
    if (event.key.toLowerCase() === "f") {
      userMoved = false;
      fit();
      scheduleDraw();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code !== "Space") return;
    spaceHeld = false;
    stage.classList.remove("is-panning");
  });

  window.addEventListener("blur", () => {
    spaceHeld = false;
    stage.classList.remove("is-panning");
  });

  document.querySelector("#copy").addEventListener("click", async () => {
    const text = placementBlock();
    try {
      await navigator.clipboard.writeText(text);
      showStatus("Copied placements.");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showStatus("Copied placements.");
    }
  });

  document.querySelector("#download").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(exportDocument(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "dot-grid.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showStatus("Downloaded dot-grid.json.");
  });

  document.querySelector("#load").addEventListener("change", async (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    try {
      const parsed = parseDocument(JSON.parse(await file.text()));
      if (!parsed.ok) {
        showStatus(parsed.error);
        return;
      }
      applyLoaded(parsed.doc, "Loaded " + file.name + ".");
    } catch {
      showStatus("That file is not valid JSON.");
    }
  });

  let stored = null;
  let storageFailed = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = parseDocument(JSON.parse(raw));
      if (parsed.ok) stored = parsed.doc;
      else storageFailed = true;
    }
  } catch {
    storageFailed = true;
  }
  if (stored) doc = stored;

  renderList();
  const observer = new ResizeObserver(() => resize());
  observer.observe(stage);
  resize();
  if (storageFailed) showStatus("Saved design could not be read. Starting from an empty grid.");
})();
