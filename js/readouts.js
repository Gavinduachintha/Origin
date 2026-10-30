export function installReadouts(app) {
  app.showStatus = function showStatus(message) {
    app.status.textContent = message;
    clearTimeout(app.statusTimer);
    app.statusTimer = setTimeout(() => {
      app.status.textContent = "";
    }, 2800);
  };

  app.updateHint = function updateHint() {
    app.hint.hidden = app.doc.elements.length > 0;
  };

  app.renderCursor = function renderCursor() {
    const x = app.hover ? String(app.hover.x) : "—";
    const y = app.hover ? String(app.hover.y) : "—";
    app.cursorX.textContent = x;
    app.cursorY.textContent = y;
    app.floatCursor.textContent = "x " + x + "    y " + y;
  };

  app.draftCircle = function draftCircle() {
    if (app.tool !== "circle" || !app.rectAnchor || !app.rectCurrent || !app.activeElement()) return null;
    return {
      x: app.rectAnchor.x,
      y: app.rectAnchor.y,
      r: app.circleRadius(app.rectAnchor, app.rectCurrent),
    };
  };

  app.showBoxReadout = function showBoxReadout() {
    app.labelX.textContent = "Start x";
    app.labelY.textContent = "Start y";
    app.labelW.textContent = "Width";
    app.labelH.textContent = "Height";
  };

  app.showCircleReadout = function showCircleReadout(circle) {
    app.labelX.textContent = "Center x";
    app.labelY.textContent = "Center y";
    app.labelW.textContent = "Radius";
    app.labelH.textContent = "Diameter";
    app.startX.textContent = String(circle.x);
    app.startY.textContent = String(circle.y);
    app.sizeW.textContent = String(circle.r);
    app.sizeH.textContent = String(circle.r * 2 + 1);
    app.dotCount.textContent = "Origin is the center. A filled circle call takes cx=" + circle.x + ", cy=" + circle.y + ", r=" + circle.r + ".";
  };

  app.renderPlacement = function renderPlacement() {
    const el = app.activeElement();
    const draft = app.draftCircle();
    if (!el) {
      app.activeName.textContent = "No element";
      app.showBoxReadout();
      app.startX.textContent = "—";
      app.startY.textContent = "—";
      app.sizeW.textContent = "—";
      app.sizeH.textContent = "—";
      app.dotCount.textContent = "Add an element. It starts as a box you can size and align.";
      app.syncGeometryForm(null, true);
      return;
    }
    app.activeName.textContent = el.name;
    if (draft) {
      app.showCircleReadout(draft);
      app.syncGeometryForm(null, true);
      return;
    }
    if (el.circle && !el.box) {
      app.showCircleReadout(el.circle);
      app.syncGeometryForm(null, true);
      return;
    }
    app.showBoxReadout();
    const box = app.geometry(el);
    if (!box) {
      app.startX.textContent = "—";
      app.startY.textContent = "—";
      app.sizeW.textContent = "—";
      app.sizeH.textContent = "—";
      app.dotCount.textContent = "No size yet. Set width and height, or paint a few dots.";
      app.syncGeometryForm(null, false);
      return;
    }
    app.startX.textContent = String(box.x);
    app.startY.textContent = String(box.y);
    app.sizeW.textContent = String(box.w);
    app.sizeH.textContent = String(box.h);
    const right = app.gridW - (box.x + box.w);
    const bottom = app.gridH - (box.y + box.h);
    const ink = app.bounds(el);
    const inkNote = ink ? ink.n + (ink.n === 1 ? " painted dot. " : " painted dots. ") : "";
    app.dotCount.textContent = inkNote + "Margins  left " + box.x + " · right " + right + " · top " + box.y + " · bottom " + bottom + ".";
    app.syncGeometryForm(box, false);
  };

  app.updateListMeta = function updateListMeta() {
    for (const row of app.list.querySelectorAll(".element")) {
      const el = app.doc.elements.find((item) => item.id === row.dataset.id);
      const meta = row.querySelector(".meta");
      if (!el || !meta) continue;
      const frame = app.geometry(el);
      if (el.circle && !el.box) {
        meta.textContent = "cx=" + el.circle.x + "  cy=" + el.circle.y + "  r=" + el.circle.r;
      } else {
        meta.textContent = frame
          ? "x=" + frame.x + "  y=" + frame.y + "  ·  " + frame.w + "×" + frame.h
          : "empty";
      }
    }
  };

  app.refreshReadouts = function refreshReadouts() {
    app.renderPlacement();
    app.updateListMeta();
    const text = app.placementBlock();
    if (app.placementText.textContent !== text) app.placementText.textContent = text;
  };

  app.scheduleReadouts = function scheduleReadouts() {
    if (app.readoutScheduled) return;
    app.readoutScheduled = true;
    requestAnimationFrame(() => {
      app.readoutScheduled = false;
      app.refreshReadouts();
    });
  };

  app.syncGeometryForm = function syncGeometryForm(box, locked) {
    const align = document.querySelector(".align");
    const inputs = [
      document.querySelector("#geom-x"),
      document.querySelector("#geom-y"),
      document.querySelector("#geom-w"),
      document.querySelector("#geom-h"),
    ];
    for (const input of inputs) input.disabled = locked;
    document.querySelector("#geom-form button[type='submit']").disabled = locked;
    document.querySelector("#fill-box").disabled = locked || !box;
    for (const button of align.querySelectorAll("button")) button.disabled = locked || !box;
    const values = box ? [box.x, box.y, box.w, box.h] : ["", "", "", ""];
    inputs.forEach((input, index) => {
      if (document.activeElement === input) return;
      input.value = String(values[index]);
    });
  };

  app.renderList = function renderList() {
    app.list.replaceChildren();
    app.updateHint();
    if (!app.doc.elements.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No elements yet.";
      app.list.append(empty);
      app.refreshReadouts();
      return;
    }

    const frontFirst = [...app.doc.elements].reverse();
    for (const el of frontFirst) {
      const index = app.doc.elements.findIndex((item) => item.id === el.id);
      const row = document.createElement("li");
      row.className = "element" + (el.id === app.doc.activeElementId ? " is-active" : "") + (el.visible ? "" : " is-hidden");
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
      forward.disabled = index === app.doc.elements.length - 1;

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
      app.list.append(row);
    }
    app.refreshReadouts();
  };

  app.markActiveRows = function markActiveRows() {
    for (const row of app.list.querySelectorAll(".element")) {
      row.classList.toggle("is-active", row.dataset.id === app.doc.activeElementId);
    }
  };

  app.selectElement = function selectElement(id) {
    app.doc.activeElementId = id;
    app.markActiveRows();
    app.renderPlacement();
    app.persist();
    app.scheduleDraw();
  };

  app.moveElement = function moveElement(id, delta) {
    const index = app.doc.elements.findIndex((item) => item.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= app.doc.elements.length) return;
    app.remember();
    const [el] = app.doc.elements.splice(index, 1);
    app.doc.elements.splice(next, 0, el);
    app.doc.activeElementId = id;
    app.paintDirty = true;
    app.persist();
    app.renderList();
    app.scheduleDraw();
  };

  app.toggleVisible = function toggleVisible(id) {
    const el = app.doc.elements.find((item) => item.id === id);
    if (!el) return;
    app.remember();
    el.visible = !el.visible;
    app.doc.activeElementId = id;
    app.paintDirty = true;
    app.persist();
    app.renderList();
    app.scheduleDraw();
  };

  app.removeElement = function removeElement(id) {
    app.remember();
    app.doc.elements = app.doc.elements.filter((item) => item.id !== id);
    if (app.doc.activeElementId === id) {
      app.doc.activeElementId = app.doc.elements.length ? app.doc.elements[app.doc.elements.length - 1].id : null;
    }
    app.paintDirty = true;
    app.persist();
    app.renderList();
    app.scheduleDraw();
  };
}
