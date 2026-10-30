import type { CSSProperties } from "react";
import { CELL, GRID_COLS, GRID_ROWS, type FilmModel } from "./model";

const SWATCHES = ["#f4f1e8", "#c6f135", "#ffb020", "#ff5a36", "#3ec1ff", "#7aa2ff", "#1a1a1a", "#8d9a86"];

const font = '"Segoe UI", sans-serif';
const mono = 'Consolas, "Cascadia Mono", monospace';

const panelStyle = (
  progress: number,
  from: { x: number; y: number; z: number },
  split: { x: number; y: number; z: number },
  separate: number,
  base: CSSProperties,
): CSSProperties => {
  const travel = 1 - progress;
  const floating = travel + separate;
  return {
    position: "absolute",
    background: "#161c16",
    border: "1px solid #2c382c",
    color: "#f3f6ef",
    fontFamily: font,
    opacity: progress <= 0 ? 0 : Math.min(1, progress * 1.4),
    transform: `translate3d(${travel * from.x + separate * split.x}px, ${travel * from.y + separate * split.y}px, ${travel * from.z + separate * split.z}px)`,
    boxShadow: floating > 0.05 ? `0 28px 70px rgba(0,0,0,${0.38 * Math.min(1, floating)})` : "none",
    ...base,
  };
};

const button = (on: boolean): CSSProperties => ({
  background: on ? "#c6f135" : "#222a20",
  color: on ? "#142000" : "#f3f6ef",
  border: `1px solid ${on ? "#c6f135" : "#3a4838"}`,
  borderRadius: 4,
  padding: "6px 10px",
  font: "inherit",
  fontSize: 14,
});

export const Chrome = ({ model }: { model: FilmModel }) => {
  const { parts, separate } = model;
  const fieldW = GRID_COLS * CELL;
  const fieldH = GRID_ROWS * CELL;
  return (
    <div style={{ width: 1480, height: 820, position: "relative", transformStyle: "preserve-3d" }}>
      <header
        style={panelStyle(parts.header, { x: 0, y: -260, z: -80 }, { x: 0, y: -28, z: 80 }, separate, {
          left: 0,
          top: 0,
          width: 1480,
          height: 92,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          overflow: "visible",
        })}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              backgroundImage: "radial-gradient(circle, #c6f135 1.6px, transparent 1.7px)",
              backgroundSize: "9px 9px",
              backgroundPosition: "center",
            }}
          />
          <div>
            <p style={{ margin: 0, color: "#c6f135", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Pocket display
            </p>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em" }}>Origin</h1>
            <form style={{ display: "flex", alignItems: "flex-end", gap: 6, marginTop: 6 }}>
              <SizeField label="Width" value={model.gridW} hot={model.flash === "size"} />
              <span style={{ color: "#b7c4ae", paddingBottom: 4 }}>×</span>
              <SizeField label="Height" value={model.gridH} hot={model.flash === "size"} />
              <button type="button" style={{ ...button(model.flash === "size"), marginBottom: 0 }}>
                Apply
              </button>
            </form>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            transform: `translate3d(0, ${(1 - parts.tools) * -150}px, 0)`,
            opacity: parts.tools,
          }}
        >
          {(["pencil", "eraser", "rect", "pan"] as const).map((tool) => (
            <button key={tool} type="button" style={button(model.tool === tool)}>
              {tool === "rect" ? "Rectangle" : tool[0].toUpperCase() + tool.slice(1)}
            </button>
          ))}
          <button type="button" style={button(false)}>
            Fit
          </button>
          <div style={{ display: "flex", gap: 6, marginLeft: 6 }}>
            {SWATCHES.map((swatch) => (
              <span
                key={swatch}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: swatch,
                  outline: model.color.toLowerCase() === swatch ? "2px solid #f3f6ef" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>
      </header>

      <section
        style={panelStyle(parts.stage, { x: -360, y: 30, z: -460 }, { x: -10, y: 0, z: 0 }, separate, {
          left: 0,
          top: 92,
          width: 1128,
          height: 728,
          background: "#0b0e0b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        })}
      >
        <div style={{ position: "relative", width: fieldW, height: fieldH }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#0b0e0b",
              backgroundImage: "radial-gradient(circle, #314033 1.25px, transparent 1.45px)",
              backgroundSize: `${CELL}px ${CELL}px`,
              backgroundPosition: `${CELL / 2}px ${CELL / 2}px`,
            }}
          />
          {model.dots.map((dot, index) => (
            <span
              key={`${dot.x}-${dot.y}-${index}`}
              style={{
                position: "absolute",
                left: dot.x * CELL + CELL / 2 - 4.5,
                top: dot.y * CELL + CELL / 2 - 4.5,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: dot.color,
                opacity: dot.opacity,
              }}
            />
          ))}
          {model.origin ? (
            <span
              style={{
                position: "absolute",
                left: model.origin.x * CELL + 2,
                top: model.origin.y * CELL + 2,
                width: 8,
                height: 8,
                border: "1.5px solid #c6f135",
                boxShadow: "0 0 0 1px rgba(7,10,8,0.8)",
              }}
            />
          ) : null}
          {model.cursor ? (
            <span
              style={{
                position: "absolute",
                left: model.cursor.x * CELL + 1,
                top: model.cursor.y * CELL + 1,
                width: CELL - 2,
                height: CELL - 2,
                borderRadius: "50%",
                border: "1.5px solid #f3f6ef",
              }}
            />
          ) : null}
          {model.hint ? (
            <p style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", margin: 0, color: "#8fa18a" }}>
              {model.hint}
            </p>
          ) : null}
          <p style={{ position: "absolute", right: 8, bottom: 6, margin: 0, color: "#8fa18a", fontFamily: mono, fontSize: 12 }}>
            {model.floatCursor}
          </p>
        </div>
        <p style={{ margin: 0, color: "#8fa18a", fontSize: 13, letterSpacing: "0.04em" }}>
          {model.gridW} × {model.gridH}, zoomed in
        </p>
      </section>

      <aside
        style={panelStyle(parts.readout, { x: 420, y: -20, z: -180 }, { x: 28, y: -8, z: 110 }, separate, {
          left: 1128,
          top: 92,
          width: 352,
          height: 250,
          padding: 16,
        })}
      >
        <h2 style={heading}>Cursor</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Metric label="x" value={model.cursor ? String(model.cursor.x) : "—"} />
          <Metric label="y" value={model.cursor ? String(model.cursor.y) : "—"} />
        </div>
        <h2 style={{ ...heading, marginTop: 14, fontSize: 18, letterSpacing: "-0.03em", textTransform: "none", color: "#f3f6ef" }}>
          {model.readout.name}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Metric label="Start x" value={model.readout.x} hot={model.flash === "readout"} />
          <Metric label="Start y" value={model.readout.y} hot={model.flash === "readout"} />
          <Metric label="Width" value={model.readout.w} hot={model.flash === "readout"} />
          <Metric label="Height" value={model.readout.h} hot={model.flash === "readout"} />
        </div>
      </aside>

      <aside
        style={panelStyle(parts.elements, { x: 480, y: 40, z: -260 }, { x: 36, y: 0, z: 60 }, separate, {
          left: 1128,
          top: 342,
          width: 352,
          height: 250,
          padding: 14,
          overflow: "hidden",
        })}
      >
        <h2 style={heading}>Elements</h2>
        <p style={quiet}>The top of the list is drawn in front.</p>
        <div style={{ display: "flex", gap: 8, margin: "8px 0" }}>
          <div style={{ flex: 1, background: "#10150f", border: "1px solid #2c382c", borderRadius: 4, padding: "6px 8px", color: model.nameField ? "#f3f6ef" : "#8fa18a" }}>
            {model.nameField || "Name a piece"}
          </div>
          <button type="button" style={button(false)}>Add</button>
        </div>
        {model.rows.length === 0 ? <p style={quiet}>No elements yet.</p> : null}
        <div style={{ display: "grid", gap: 6 }}>
          {model.rows.map((row) => (
            <div
              key={row.name}
              style={{
                background: "#10150f",
                border: `1px solid ${row.active ? "#c6f135" : "transparent"}`,
                padding: 6,
                opacity: row.hidden ? 0.55 : 1,
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" style={{ ...button(false), padding: "3px 7px", fontSize: 12 }}>{row.hideLabel}</button>
                <span style={{ flex: 1 }}>{row.name}</span>
              </div>
              <p style={{ ...quiet, fontFamily: mono, margin: "4px 0" }}>{row.meta}</p>
            </div>
          ))}
        </div>
      </aside>

      <aside
        style={panelStyle(parts.placements, { x: 80, y: 280, z: -140 }, { x: 46, y: 16, z: 140 }, separate, {
          left: 1128,
          top: 592,
          width: 352,
          height: 228,
          padding: 14,
        })}
      >
        <h2 style={heading}>Placements</h2>
        <p style={quiet}>Front to back. Start x and y are the top-left painted dot.</p>
        <pre
          style={{
            margin: "8px 0",
            fontFamily: mono,
            fontSize: 13,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
            color: "#f3f6ef",
            border: model.flash === "copy" ? "1px solid #c6f135" : "1px solid transparent",
            padding: 4,
          }}
        >
          {model.placements}
        </pre>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" style={button(model.flash === "copy")}>Copy placements</button>
          <button type="button" style={button(false)}>Download</button>
          <button type="button" style={button(false)}>Load</button>
        </div>
        <p style={{ ...quiet, minHeight: 16, color: model.status ? "#c6f135" : "#8fa18a" }}>{model.status}</p>
      </aside>
    </div>
  );
};

const heading: CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 650,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#b7c4ae",
};

const quiet: CSSProperties = {
  margin: "4px 0 0",
  color: "#8fa18a",
  fontSize: 12,
  lineHeight: 1.4,
};

const Metric = ({ label, value, hot }: { label: string; value: string; hot?: boolean }) => (
  <div style={{ background: "#10150f", border: `1px solid ${hot ? "#c6f135" : "#2c382c"}`, padding: "6px 8px" }}>
    <span style={{ display: "block", color: "#8fa18a", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    <strong style={{ display: "block", marginTop: 1, fontFamily: mono, fontSize: 22, fontWeight: 500 }}>{value}</strong>
  </div>
);

const SizeField = ({ label, value, hot }: { label: string; value: number; hot: boolean }) => (
  <label style={{ display: "grid", gap: 2, color: "#8fa18a", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
    {label}
    <span
      style={{
        display: "block",
        width: 64,
        padding: "4px 6px",
        fontFamily: mono,
        fontSize: 14,
        letterSpacing: 0,
        textTransform: "none",
        color: "#f3f6ef",
        background: "#10150f",
        border: `1px solid ${hot ? "#c6f135" : "#2c382c"}`,
        borderRadius: 4,
      }}
    >
      {value}
    </span>
  </label>
);
