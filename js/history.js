import { HISTORY_LIMIT } from "./session.js";

export function installHistory(app) {
  app.snapshot = function snapshot() {
    return {
      width: app.gridW,
      height: app.gridH,
      activeElementId: app.doc.activeElementId,
      elements: app.copyElements(app.doc.elements),
    };
  };

  app.syncHistoryButtons = function syncHistoryButtons() {
    app.undoButton.disabled = app.undoStack.length === 0;
    app.redoButton.disabled = app.redoStack.length === 0;
  };

  app.pushUndo = function pushUndo(snap) {
    app.undoStack.push(snap);
    if (app.undoStack.length > HISTORY_LIMIT) app.undoStack.shift();
    app.redoStack.length = 0;
    app.syncHistoryButtons();
  };

  app.armHistory = function armHistory() {
    if (!app.armedBefore) app.armedBefore = app.snapshot();
  };

  app.sealHistory = function sealHistory() {
    if (!app.armedBefore) return;
    app.pushUndo(app.armedBefore);
    app.armedBefore = null;
  };

  app.discardHistory = function discardHistory() {
    app.armedBefore = null;
  };

  app.remember = function remember() {
    app.discardHistory();
    app.pushUndo(app.snapshot());
  };

  app.restore = function restore(snap) {
    app.doc = {
      width: snap.width,
      height: snap.height,
      activeElementId: snap.activeElementId,
      elements: app.copyElements(snap.elements),
    };
    const sizeChanged = app.gridW !== snap.width || app.gridH !== snap.height;
    app.gridW = snap.width;
    app.gridH = snap.height;
    app.paintDirty = true;
    app.rectAnchor = null;
    app.rectCurrent = null;
    app.painting = false;
    if (sizeChanged) {
      app.layerGridW = -1;
      app.gridDirty = true;
      app.userMoved = false;
      app.hover = null;
      app.fit();
      app.publishGridSize();
    }
    app.renderList();
    app.persist();
    app.scheduleDraw();
  };

  app.undo = function undo() {
    if (app.painting || app.rectAnchor || app.panning || !app.undoStack.length) return;
    app.redoStack.push(app.snapshot());
    app.restore(app.undoStack.pop());
    app.syncHistoryButtons();
    app.showStatus("Undid the last change.");
  };

  app.redo = function redo() {
    if (app.painting || app.rectAnchor || app.panning || !app.redoStack.length) return;
    app.undoStack.push(app.snapshot());
    app.restore(app.redoStack.pop());
    app.syncHistoryButtons();
    app.showStatus("Redid the last change.");
  };
}
