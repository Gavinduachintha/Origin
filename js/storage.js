import { STORAGE_KEY } from "./session.js";

export function installStorage(app) {
  app.persist = function persist() {
    clearTimeout(app.persistTimer);
    app.persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(app.exportDocument()));
      } catch {
        app.showStatus("Could not save in this browser.");
      }
    }, 120);
  };

  app.publishGridSize = function publishGridSize() {
    document.title = "Origin · " + app.gridW + "×" + app.gridH;
    app.canvas.setAttribute("aria-label", app.gridW + " by " + app.gridH + " dot grid. Each dot is one display pixel.");
    app.widthInput.value = String(app.gridW);
    app.heightInput.value = String(app.gridH);
  };

  app.resizeGrid = function resizeGrid(width, height) {
    const invalid = app.sizeError(width, height);
    if (invalid) {
      app.showStatus(invalid);
      app.publishGridSize();
      return;
    }
    if (width === app.gridW && height === app.gridH) return;
    app.remember();
    const dropped = app.clipToGrid(width, height);
    app.doc.width = width;
    app.doc.height = height;
    app.gridW = width;
    app.gridH = height;
    app.layerGridW = -1;
    app.paintDirty = true;
    app.gridDirty = true;
    app.userMoved = false;
    app.hover = null;
    app.rectAnchor = null;
    app.rectCurrent = null;
    app.fit();
    app.publishGridSize();
    app.persist();
    app.scheduleReadouts();
    app.scheduleDraw();
    app.showStatus(
      "Grid is " + width + "×" + height + "." +
      (dropped ? " Dots past the new edge were removed." : "")
    );
  };

  app.applyLoaded = function applyLoaded(next, message) {
    app.remember();
    app.doc = next;
    app.gridW = app.doc.width;
    app.gridH = app.doc.height;
    app.layerGridW = -1;
    app.paintDirty = true;
    app.gridDirty = true;
    app.userMoved = false;
    app.fit();
    app.publishGridSize();
    app.renderList();
    app.persist();
    app.scheduleDraw();
    app.showStatus(message);
  };
}
