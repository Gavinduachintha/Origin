export function installPaint(app) {
  app.setColor = function setColor(next) {
    app.color = next;
    app.colorInput.value = next;
    for (const button of app.swatchBox.children) {
      button.classList.toggle("is-on", button.dataset.color === next.toLowerCase());
    }
  };

  app.applyTool = function applyTool(next) {
    app.tool = next;
    app.canvas.dataset.tool = next;
    for (const button of app.toolButtons) {
      const on = button.dataset.tool === next;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    }
  };

  app.setTool = function setTool(next) {
    if (app.heldEraser) {
      app.toolBeforeEraser = next;
      return;
    }
    app.applyTool(next);
  };

  app.beginEraseHold = function beginEraseHold() {
    if (app.heldEraser) return;
    app.toolBeforeEraser = app.tool;
    app.heldEraser = true;
    app.applyTool("eraser");
  };

  app.endEraseHold = function endEraseHold() {
    if (!app.heldEraser) return;
    app.heldEraser = false;
    const next = app.toolBeforeEraser || "pencil";
    app.toolBeforeEraser = null;
    app.applyTool(next);
  };

  // Pointer position is in CSS pixels. pan and cell live in that same space,
  // so a resized backing store (devicePixelRatio) must not be applied here.
  app.cellFromEvent = function cellFromEvent(event) {
    const rect = app.canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - app.panX) / app.cell);
    const y = Math.floor((event.clientY - rect.top - app.panY) / app.cell);
    if (x < 0 || y < 0 || x >= app.gridW || y >= app.gridH) return null;
    return { x, y };
  };

  app.paintAt = function paintAt(x, y) {
    const el = app.activeElement();
    if (!el) return false;
    if (x < 0 || y < 0 || x >= app.gridW || y >= app.gridH) return false;
    const key = x + "," + y;
    if (app.tool === "eraser") {
      if (!(key in el.pixels)) return false;
      delete el.pixels[key];
    } else if (el.pixels[key] === app.color) {
      return false;
    } else {
      el.pixels[key] = app.color;
    }
    el.circle = null;
    app.restampCell(x, y);
    return true;
  };

  app.forEachCellOnLine = function forEachCellOnLine(a, b, fn) {
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
  };

  app.commitRect = function commitRect(a, b) {
    const el = app.activeElement();
    if (!el) return;
    const x0 = Math.max(0, Math.min(a.x, b.x));
    const x1 = Math.min(app.gridW - 1, Math.max(a.x, b.x));
    const y0 = Math.max(0, Math.min(a.y, b.y));
    const y1 = Math.min(app.gridH - 1, Math.max(a.y, b.y));
    let changed = false;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const key = x + "," + y;
        if (el.pixels[key] === app.color) continue;
        el.pixels[key] = app.color;
        changed = true;
      }
    }
    if (!changed) return;
    el.circle = null;
    app.paintDirty = true;
    app.edited = true;
  };

  app.commitCircle = function commitCircle(center, edge) {
    const el = app.activeElement();
    if (!el) return;
    const radius = app.circleRadius(center, edge);
    const limit = radius * radius;
    let changed = false;
    for (let y = center.y - radius; y <= center.y + radius; y += 1) {
      if (y < 0 || y >= app.gridH) continue;
      for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        if (x < 0 || x >= app.gridW) continue;
        const dx = x - center.x;
        const dy = y - center.y;
        if (dx * dx + dy * dy > limit) continue;
        const key = x + "," + y;
        if (el.pixels[key] === app.color) continue;
        el.pixels[key] = app.color;
        changed = true;
      }
    }
    const previous = el.circle;
    const same = previous && previous.x === center.x && previous.y === center.y && previous.r === radius;
    el.circle = { x: center.x, y: center.y, r: radius };
    if (changed) app.paintDirty = true;
    if (changed || !same) app.edited = true;
    app.showStatus("Circle  cx=" + center.x + "  cy=" + center.y + "  r=" + radius);
  };

  app.endPointer = function endPointer() {
    const anchor = app.rectAnchor;
    const current = app.rectCurrent;
    const wasPainting = app.painting;
    app.rectAnchor = null;
    app.rectCurrent = null;
    app.painting = false;
    app.panning = false;
    app.panOrigin = null;
    app.lastCell = null;
    app.moveFrom = null;
    app.dragId = null;
    app.stage.classList.remove("is-grabbing");
    app.stage.classList.remove("is-movable");
    const usedRect = anchor && current && app.tool === "rect";
    const usedCircle = anchor && current && app.tool === "circle";
    if (usedRect) app.commitRect(anchor, current);
    if (usedCircle) app.commitCircle(anchor, current);
    if (app.edited) {
      app.edited = false;
      app.sealHistory();
      app.persist();
      app.scheduleReadouts();
    } else {
      app.discardHistory();
      if (wasPainting || usedRect || usedCircle) app.scheduleReadouts();
    }
    app.endEraseHold();
    app.scheduleDraw();
  };

  app.onPointerDown = function onPointerDown(event) {
    const eraseHold = event.button === 2;
    event.preventDefault();
    if (eraseHold) app.beginEraseHold();
    const wantsPan = !eraseHold && (event.button === 1 || app.tool === "pan" || app.spaceHeld);
    if (wantsPan) {
      app.panning = true;
      app.userMoved = true;
      app.panOrigin = { x: event.clientX, y: event.clientY, panX: app.panX, panY: app.panY };
      app.stage.classList.add("is-grabbing");
      app.canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (!eraseHold && event.button !== 0) return;
    app.canvas.setPointerCapture(event.pointerId);
    const pos = app.cellFromEvent(event);
    app.hover = pos;
    app.renderCursor();
    if (!pos) return;
    if (!app.activeElement()) {
      app.showStatus("Add an element before painting.");
      return;
    }
    if (app.tool === "move") {
      const hit = app.elementAt(pos.x, pos.y);
      if (!hit) {
        app.showStatus("Click an element to drag it.");
        return;
      }
      app.selectElement(hit.id);
      app.armHistory();
      app.dragId = hit.id;
      app.moveFrom = pos;
      app.stage.classList.add("is-grabbing");
      return;
    }
    if (app.tool === "rect" || app.tool === "circle") {
      app.armHistory();
      app.rectAnchor = pos;
      app.rectCurrent = pos;
      app.scheduleDraw();
      if (app.tool === "circle") app.scheduleReadouts();
      return;
    }
    app.painting = true;
    app.lastCell = pos;
    app.armHistory();
    if (app.paintAt(pos.x, pos.y)) app.edited = true;
    app.scheduleDraw();
    app.scheduleReadouts();
  };

  app.onPointerMove = function onPointerMove(event) {
    const pos = app.cellFromEvent(event);
    const hoverChanged = !app.hover || !pos || app.hover.x !== pos.x || app.hover.y !== pos.y;
    if (hoverChanged) {
      app.hover = pos;
      app.renderCursor();
    }
    if (app.panning && app.panOrigin) {
      app.panX = Math.round(app.panOrigin.panX + (event.clientX - app.panOrigin.x));
      app.panY = Math.round(app.panOrigin.panY + (event.clientY - app.panOrigin.y));
      app.userMoved = true;
      app.scheduleDraw();
      return;
    }
    if (app.dragId && app.moveFrom && pos) {
      const el = app.doc.elements.find((item) => item.id === app.dragId);
      if (el) {
        const applied = app.nudgeElement(el, pos.x - app.moveFrom.x, pos.y - app.moveFrom.y);
        if (applied.dx || applied.dy) {
          app.moveFrom = { x: app.moveFrom.x + applied.dx, y: app.moveFrom.y + applied.dy };
          app.edited = true;
          app.scheduleReadouts();
        }
      }
      app.scheduleDraw();
      return;
    }
    if (app.tool === "move" && hoverChanged) {
      app.stage.classList.toggle("is-movable", Boolean(pos && app.elementAt(pos.x, pos.y)));
    }
    if ((app.tool === "rect" || app.tool === "circle") && app.rectAnchor) {
      if (pos) app.rectCurrent = pos;
      app.scheduleDraw();
      if (app.tool === "circle") app.scheduleReadouts();
      return;
    }
    if (app.painting && pos && app.lastCell) {
      app.forEachCellOnLine(app.lastCell, pos, (x, y) => {
        if (app.paintAt(x, y)) app.edited = true;
      });
      app.lastCell = pos;
      app.scheduleDraw();
      app.scheduleReadouts();
      return;
    }
    if (app.painting && pos) {
      app.lastCell = pos;
      if (app.paintAt(pos.x, pos.y)) app.edited = true;
      app.scheduleDraw();
      app.scheduleReadouts();
      return;
    }
    if (app.painting && !pos) app.lastCell = null;
    if (hoverChanged) app.scheduleDraw();
  };

  app.zoomAt = function zoomAt(clientX, clientY, direction) {
    const rect = app.canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const gridX = (mx - app.panX) / app.cell;
    const gridY = (my - app.panY) / app.cell;
    const next = Math.min(18, Math.max(2, app.cell + direction));
    if (next === app.cell) return;
    app.cell = next;
    app.panX = Math.round(mx - gridX * app.cell);
    app.panY = Math.round(my - gridY * app.cell);
    app.userMoved = true;
    app.scheduleDraw();
  };
}
