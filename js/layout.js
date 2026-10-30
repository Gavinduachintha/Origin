export function installLayout(app) {
  app.shiftElement = function shiftElement(el, dx, dy) {
    if (!dx && !dy) return;
    if (el.box) {
      el.box.x += dx;
      el.box.y += dy;
    }
    if (el.circle) {
      el.circle.x += dx;
      el.circle.y += dy;
    }
    const next = {};
    let any = false;
    for (const key in el.pixels) {
      const comma = key.indexOf(",");
      const x = +key.slice(0, comma) + dx;
      const y = +key.slice(comma + 1) + dy;
      if (x < 0 || y < 0 || x >= app.gridW || y >= app.gridH) continue;
      next[x + "," + y] = el.pixels[key];
      any = true;
    }
    if (any || dx || dy) el.pixels = next;
  };

  app.clampFrame = function clampFrame(x, y, w, h) {
    w = Math.max(1, Math.min(app.gridW, Math.round(w)));
    h = Math.max(1, Math.min(app.gridH, Math.round(h)));
    x = Math.max(0, Math.min(app.gridW - w, Math.round(x)));
    y = Math.max(0, Math.min(app.gridH - h, Math.round(y)));
    return { x, y, w, h };
  };

  app.placeElement = function placeElement(el, x, y, w, h) {
    const next = app.clampFrame(x, y, w, h);
    const current = el.box
      ? { x: el.box.x, y: el.box.y, w: el.box.w, h: el.box.h }
      : app.geometry(el);
    if (!el.box) {
      el.box = {
        x: current ? current.x : next.x,
        y: current ? current.y : next.y,
        w: current ? current.w : next.w,
        h: current ? current.h : next.h,
        fill: app.color,
      };
    }
    app.shiftElement(el, next.x - el.box.x, next.y - el.box.y);
    el.box.w = next.w;
    el.box.h = next.h;
    app.paintDirty = true;
  };

  app.elementAt = function elementAt(x, y) {
    for (let i = app.doc.elements.length - 1; i >= 0; i -= 1) {
      const el = app.doc.elements[i];
      if (!el.visible) continue;
      if (el.pixels[x + "," + y]) return el;
      const box = el.box;
      if (box && x >= box.x && y >= box.y && x < box.x + box.w && y < box.y + box.h) return el;
      if (el.circle) {
        const dx = x - el.circle.x;
        const dy = y - el.circle.y;
        if (dx * dx + dy * dy <= el.circle.r * el.circle.r) return el;
      }
    }
    return null;
  };

  app.nudgeElement = function nudgeElement(el, dx, dy) {
    const geo = app.geometry(el);
    if (!geo) return { dx: 0, dy: 0 };
    const next = app.clampFrame(geo.x + dx, geo.y + dy, geo.w, geo.h);
    const applied = { dx: next.x - geo.x, dy: next.y - geo.y };
    if (!applied.dx && !applied.dy) return applied;
    if (!el.box) {
      el.box = { x: geo.x, y: geo.y, w: geo.w, h: geo.h, fill: app.color };
    }
    app.shiftElement(el, applied.dx, applied.dy);
    app.paintDirty = true;
    return applied;
  };

  app.alignElement = function alignElement(edge) {
    const el = app.activeElement();
    const geo = el && app.geometry(el);
    if (!el || !geo) {
      app.showStatus("Add an element before aligning it.");
      return;
    }
    let x = geo.x;
    let y = geo.y;
    if (edge === "left") x = 0;
    else if (edge === "right") x = app.gridW - geo.w;
    else if (edge === "center") x = Math.floor((app.gridW - geo.w) / 2);
    else if (edge === "top") y = 0;
    else if (edge === "bottom") y = app.gridH - geo.h;
    else if (edge === "middle") y = Math.floor((app.gridH - geo.h) / 2);
    else return;
    if (x === geo.x && y === geo.y) {
      app.showStatus(el.name + " is already on that edge.");
      return;
    }
    app.remember();
    app.placeElement(el, x, y, geo.w, geo.h);
    app.persist();
    app.scheduleReadouts();
    app.scheduleDraw();
  };

  app.applyGeometry = function applyGeometry(x, y, w, h) {
    const el = app.activeElement();
    if (!el) return;
    if (![x, y, w, h].every((n) => Number.isInteger(n))) {
      app.showStatus("X, Y, width, and height need whole numbers.");
      return;
    }
    if (w < 1 || h < 1) {
      app.showStatus("Width and height need to be at least 1.");
      return;
    }
    app.remember();
    app.placeElement(el, x, y, w, h);
    app.persist();
    app.scheduleReadouts();
    app.scheduleDraw();
  };

  app.fillActiveBox = function fillActiveBox() {
    const el = app.activeElement();
    if (!el) return;
    const geo = app.geometry(el);
    if (!geo) {
      app.showStatus("Set a size before filling.");
      return;
    }
    app.remember();
    if (!el.box) el.box = { x: geo.x, y: geo.y, w: geo.w, h: geo.h, fill: app.color };
    else el.box.fill = app.color;
    app.paintDirty = true;
    app.persist();
    app.scheduleDraw();
  };
}
