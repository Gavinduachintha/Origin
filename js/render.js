export function installRender(app) {
  app.dotRadius = function dotRadius() {
    const gap = app.cell >= 6 ? 2 : app.cell >= 3 ? 1 : 0;
    return Math.max(0.5, (app.cell - gap) / 2);
  };

  app.layerScale = function layerScale(dpr) {
    const maxW = 4096 / (app.gridW * app.cell);
    const maxH = 4096 / (app.gridH * app.cell);
    return Math.min(dpr, maxW, maxH);
  };

  app.fit = function fit() {
    const rect = app.stage.getBoundingClientRect();
    const margin = 28;
    const next = Math.floor(Math.min((rect.width - margin) / app.gridW, (rect.height - margin) / app.gridH));
    app.cell = Math.max(1, Math.min(18, next || 1));
    app.panX = Math.round((rect.width - app.gridW * app.cell) / 2);
    app.panY = Math.round((rect.height - app.gridH * app.cell) / 2);
  };

  app.syncLayers = function syncLayers(dpr) {
    const scale = app.layerScale(dpr);
    if (
      app.gridLayer &&
      app.layerCell === app.cell &&
      app.layerScaleValue === scale &&
      app.layerGridW === app.gridW &&
      app.layerGridH === app.gridH
    ) return;
    app.layerCell = app.cell;
    app.layerScaleValue = scale;
    app.layerGridW = app.gridW;
    app.layerGridH = app.gridH;
    const width = Math.max(1, Math.ceil(app.gridW * app.cell * scale));
    const height = Math.max(1, Math.ceil(app.gridH * app.cell * scale));
    app.gridLayer = document.createElement("canvas");
    app.paintLayer = document.createElement("canvas");
    app.gridLayer.width = width;
    app.gridLayer.height = height;
    app.paintLayer.width = width;
    app.paintLayer.height = height;
    app.gridDirty = true;
    app.paintDirty = true;
  };

  app.traceDots = function traceDots(context, keys) {
    const radius = app.dotRadius();
    const chunk = 4000;
    for (let start = 0; start < keys.length; start += chunk) {
      context.beginPath();
      const end = Math.min(keys.length, start + chunk);
      for (let i = start; i < end; i += 1) {
        const key = keys[i];
        const comma = key.indexOf(",");
        const x = +key.slice(0, comma);
        const y = +key.slice(comma + 1);
        const cx = x * app.cell + app.cell / 2;
        const cy = y * app.cell + app.cell / 2;
        context.moveTo(cx + radius, cy);
        context.arc(cx, cy, radius, 0, Math.PI * 2);
      }
      context.fill();
    }
  };

  app.rebuildGrid = function rebuildGrid() {
    const g = app.gridLayer.getContext("2d");
    g.setTransform(app.layerScaleValue, 0, 0, app.layerScaleValue, 0, 0);
    g.clearRect(0, 0, app.gridW * app.cell, app.gridH * app.cell);
    g.fillStyle = app.DOT_COLOR;
    const radius = app.dotRadius();
    const chunk = 4000;
    let n = 0;
    g.beginPath();
    for (let y = 0; y < app.gridH; y += 1) {
      for (let x = 0; x < app.gridW; x += 1) {
        const cx = x * app.cell + app.cell / 2;
        const cy = y * app.cell + app.cell / 2;
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
    app.gridDirty = false;
  };

  app.rebuildPaint = function rebuildPaint() {
    const g = app.paintLayer.getContext("2d");
    g.setTransform(app.layerScaleValue, 0, 0, app.layerScaleValue, 0, 0);
    g.clearRect(0, 0, app.gridW * app.cell, app.gridH * app.cell);
    for (const el of app.doc.elements) {
      if (!el.visible) continue;
      if (el.box) {
        g.fillStyle = el.box.fill;
        g.fillRect(
          el.box.x * app.cell,
          el.box.y * app.cell,
          el.box.w * app.cell,
          el.box.h * app.cell
        );
      }
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
        app.traceDots(g, keys);
      }
    }
    app.paintDirty = false;
  };

  app.restampCell = function restampCell(x, y) {
    if (!app.paintLayer || app.paintDirty) return;
    const g = app.paintLayer.getContext("2d");
    const radius = app.dotRadius();
    const cx = x * app.cell + app.cell / 2;
    const cy = y * app.cell + app.cell / 2;
    g.setTransform(app.layerScaleValue, 0, 0, app.layerScaleValue, 0, 0);
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(cx, cy, radius + 0.75, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = "source-over";
    for (const el of app.doc.elements) {
      if (!el.visible) continue;
      const box = el.box;
      if (box && x >= box.x && y >= box.y && x < box.x + box.w && y < box.y + box.h) {
        g.fillStyle = box.fill;
        g.fillRect(x * app.cell, y * app.cell, app.cell, app.cell);
      }
      const fill = el.pixels[x + "," + y];
      if (!fill) continue;
      g.fillStyle = fill;
      g.beginPath();
      g.arc(cx, cy, radius, 0, Math.PI * 2);
      g.fill();
    }
  };

  app.drawOverlay = function drawOverlay() {
    const ctx = app.ctx;
    if (app.rectAnchor && app.rectCurrent && app.tool === "rect") {
      const x0 = Math.min(app.rectAnchor.x, app.rectCurrent.x);
      const x1 = Math.max(app.rectAnchor.x, app.rectCurrent.x);
      const y0 = Math.min(app.rectAnchor.y, app.rectCurrent.y);
      const y1 = Math.max(app.rectAnchor.y, app.rectCurrent.y);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = app.color;
      ctx.fillRect(app.panX + x0 * app.cell, app.panY + y0 * app.cell, (x1 - x0 + 1) * app.cell, (y1 - y0 + 1) * app.cell);
      ctx.restore();
    }

    if (app.rectAnchor && app.rectCurrent && app.tool === "circle") {
      const radius = app.circleRadius(app.rectAnchor, app.rectCurrent);
      const cx = app.panX + (app.rectAnchor.x + 0.5) * app.cell;
      const cy = app.panY + (app.rectAnchor.y + 0.5) * app.cell;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = app.color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * app.cell + app.cell / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (app.hover) {
      ctx.strokeStyle = app.HAIRLINE_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(app.panX + app.hover.x * app.cell + 0.5, app.panY + app.hover.y * app.cell + 0.5, app.cell - 1, app.cell - 1);
    }

    const el = app.activeElement();
    if (!el) return;
    const box = app.geometry(el);
    if (!box) return;
    ctx.save();
    ctx.strokeStyle = app.MARK_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash(el.visible ? [] : [4, 3]);
    ctx.strokeRect(
      app.panX + box.x * app.cell + 0.5,
      app.panY + box.y * app.cell + 0.5,
      box.w * app.cell - 1,
      box.h * app.cell - 1
    );
    ctx.setLineDash([]);
    ctx.fillStyle = app.MARK_COLOR;
    const mark = Math.max(3, Math.round(app.cell * 0.28));
    const origin = el.circle
      ? { x: el.circle.x, y: el.circle.y }
      : { x: box.x, y: box.y };
    ctx.fillRect(app.panX + origin.x * app.cell, app.panY + origin.y * app.cell, mark, mark);
    ctx.restore();
  };

  app.draw = function draw() {
    const rect = app.stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const ctx = app.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    app.syncLayers(dpr);
    if (app.gridDirty) app.rebuildGrid();
    if (app.paintDirty) app.rebuildPaint();
    ctx.fillStyle = app.STAGE_COLOR;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.imageSmoothingEnabled = false;
    const dw = app.gridW * app.cell;
    const dh = app.gridH * app.cell;
    ctx.drawImage(app.gridLayer, app.panX, app.panY, dw, dh);
    ctx.drawImage(app.paintLayer, app.panX, app.panY, dw, dh);
    app.drawOverlay();
    app.renderCursor();
  };

  app.scheduleDraw = function scheduleDraw() {
    if (app.drawScheduled) return;
    app.drawScheduled = true;
    requestAnimationFrame(() => {
      app.drawScheduled = false;
      app.draw();
    });
  };

  app.resize = function resize() {
    const rect = app.stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    app.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    app.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const sizeChanged = w !== app.lastViewW || h !== app.lastViewH;
    app.lastViewW = w;
    app.lastViewH = h;
    if (sizeChanged && !app.userMoved && w > 80 && h > 80) app.fit();
    app.scheduleDraw();
  };
}
