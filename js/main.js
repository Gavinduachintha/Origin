import { createApp, SWATCHES, STORAGE_KEY } from "./session.js";
import { installDocument } from "./document.js";
import { installHistory } from "./history.js";
import { installReadouts } from "./readouts.js";
import { installRender } from "./render.js";
import { installStorage } from "./storage.js";
import { installPaint } from "./paint.js";
import { installLayout } from "./layout.js";

const app = createApp();
installDocument(app);
installHistory(app);
installReadouts(app);
installRender(app);
installStorage(app);
installPaint(app);
installLayout(app);

for (const swatch of SWATCHES) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "swatch";
  button.dataset.color = swatch;
  button.style.background = swatch;
  button.title = swatch;
  button.setAttribute("aria-label", "Color " + swatch);
  button.addEventListener("click", () => app.setColor(swatch));
  app.swatchBox.append(button);
}

app.colorInput.addEventListener("input", () => app.setColor(app.colorInput.value));
app.setColor(app.color);

for (const button of app.toolButtons) {
  button.addEventListener("click", () => app.setTool(button.dataset.tool));
}
app.setTool("pencil");

document.querySelector("#fit").addEventListener("click", () => {
  app.userMoved = false;
  app.fit();
  app.scheduleDraw();
});

app.addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = app.cleanName(app.newName.value);
  if (!name) return;
  app.remember();
  const el = { id: app.uid(), name, visible: true, pixels: {}, box: app.freshBox() };
  app.doc.elements.push(el);
  app.doc.activeElementId = el.id;
  app.newName.value = "";
  app.persist();
  app.renderList();
  app.scheduleDraw();
  app.newName.focus();
});

app.list.addEventListener("click", (event) => {
  const row = event.target.closest(".element");
  if (!row) return;
  const id = row.dataset.id;
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) {
    app.selectElement(id);
    return;
  }
  if (action === "hide") app.toggleVisible(id);
  else if (action === "forward") app.moveElement(id, 1);
  else if (action === "back") app.moveElement(id, -1);
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
    app.removeElement(id);
  }
});

app.list.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.classList.contains("name")) event.target.blur();
});

app.list.addEventListener("change", (event) => {
  if (!event.target.classList.contains("name")) return;
  const row = event.target.closest(".element");
  const el = app.doc.elements.find((item) => item.id === row.dataset.id);
  if (!el) return;
  const name = app.cleanName(event.target.value);
  if (!name || name === el.name) {
    event.target.value = el.name;
    return;
  }
  app.remember();
  el.name = name;
  event.target.value = name;
  const hide = row.querySelector("[data-action='hide']");
  if (hide) hide.setAttribute("aria-label", (el.visible ? "Hide " : "Show ") + el.name);
  app.persist();
  app.refreshReadouts();
});

app.canvas.addEventListener("pointerdown", app.onPointerDown);
app.canvas.addEventListener("pointermove", app.onPointerMove);
app.canvas.addEventListener("pointerup", app.endPointer);
app.canvas.addEventListener("pointercancel", app.endPointer);
app.canvas.addEventListener("lostpointercapture", app.endPointer);
app.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
app.canvas.addEventListener("pointerleave", () => {
  if (app.painting || app.rectAnchor || app.panning) return;
  app.hover = null;
  app.renderCursor();
  app.scheduleDraw();
});

app.stage.addEventListener("wheel", (event) => {
  event.preventDefault();
  app.wheelBag += event.deltaY;
  if (Math.abs(app.wheelBag) < 40) return;
  const direction = app.wheelBag > 0 ? -1 : 1;
  app.wheelBag = 0;
  app.zoomAt(event.clientX, event.clientY, direction);
}, { passive: false });

app.undoButton.addEventListener("click", app.undo);
app.redoButton.addEventListener("click", app.redo);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const command = event.ctrlKey || event.metaKey;
  if (command && !event.altKey && (key === "z" || key === "y")) {
    if (event.target.closest("input, textarea")) return;
    event.preventDefault();
    if (key === "y" || event.shiftKey) app.redo();
    else app.undo();
    return;
  }
  if (event.target.closest("input, textarea")) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat) {
      app.spaceHeld = true;
      app.stage.classList.add("is-panning");
    }
    return;
  }
  const next = { b: "pencil", e: "eraser", r: "rect", c: "circle", h: "pan", v: "move" }[event.key.toLowerCase()];
  if (next) app.setTool(next);
  if (event.key.toLowerCase() === "f") {
    app.userMoved = false;
    app.fit();
    app.scheduleDraw();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code !== "Space") return;
  app.spaceHeld = false;
  app.stage.classList.remove("is-panning");
});

window.addEventListener("blur", () => {
  app.spaceHeld = false;
  app.stage.classList.remove("is-panning");
  if (app.heldEraser || app.painting || app.rectAnchor || app.panning) app.endPointer();
});

document.querySelector("#copy").addEventListener("click", async () => {
  const text = app.placementBlock();
  try {
    await navigator.clipboard.writeText(text);
    app.showStatus("Copied placements.");
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    app.showStatus("Copied placements.");
  }
});

document.querySelector("#download").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(app.exportDocument(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = "origin.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  app.showStatus("Downloaded origin.json.");
});

document.querySelector("#geom-form").addEventListener("submit", (event) => {
  event.preventDefault();
  app.applyGeometry(
    Math.round(Number(document.querySelector("#geom-x").value)),
    Math.round(Number(document.querySelector("#geom-y").value)),
    Math.round(Number(document.querySelector("#geom-w").value)),
    Math.round(Number(document.querySelector("#geom-h").value))
  );
});

document.querySelector("#fill-box").addEventListener("click", () => app.fillActiveBox());

document.querySelector(".align").addEventListener("click", (event) => {
  const edge = event.target.closest("[data-align]")?.dataset.align;
  if (edge) app.alignElement(edge);
});

document.querySelector("#size-form").addEventListener("submit", (event) => {
  event.preventDefault();
  app.resizeGrid(Math.round(Number(app.widthInput.value)), Math.round(Number(app.heightInput.value)));
});

document.querySelector("#load").addEventListener("change", async (event) => {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;
  try {
    const parsed = app.parseDocument(JSON.parse(await file.text()));
    if (!parsed.ok) {
      app.showStatus(parsed.error);
      return;
    }
    app.applyLoaded(parsed.doc, "Loaded " + file.name + ".");
  } catch {
    app.showStatus("That file is not valid JSON.");
  }
});

let stored = null;
let storageFailed = false;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = app.parseDocument(JSON.parse(raw));
    if (parsed.ok) stored = parsed.doc;
    else storageFailed = true;
  }
} catch {
  storageFailed = true;
}
if (stored) {
  app.doc = stored;
  app.gridW = app.doc.width;
  app.gridH = app.doc.height;
}
app.publishGridSize();

app.renderList();
const observer = new ResizeObserver(() => app.resize());
observer.observe(app.stage);
app.resize();
if (storageFailed) app.showStatus("Saved design could not be read. Starting from an empty grid.");
