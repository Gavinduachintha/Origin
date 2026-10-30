import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const VIDEO_FPS = 30;
export const VIDEO_DURATION = 600;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

const CELL = 18;
const COLS = 46;
const ROWS = 26;

const BATTERY = { name: "battery", x: 6, y: 8, w: 16, h: 9, color: "#c6f135" };
const CLOCK = { name: "clock", x: 16, y: 5, w: 12, h: 8, color: "#f4f1e8" };

const PAINT_BATTERY = [130, 230] as const;
const PAINT_CLOCK = [290, 370] as const;
const HIDE = [420, 460] as const;
const RESIZE = [470, 530] as const;

type Pixel = { x: number; y: number };

type Box = { x: number; y: number; w: number; h: number; n: number };

const block = (origin: { x: number; y: number; w: number; h: number }, count: number): Pixel[] => {
  const pixels: Pixel[] = [];
  const total = origin.w * origin.h;
  const shown = Math.max(0, Math.min(total, count));
  for (let i = 0; i < shown; i += 1) {
    pixels.push({
      x: origin.x + (i % origin.w),
      y: origin.y + Math.floor(i / origin.w),
    });
  }
  return pixels;
};

const measure = (pixels: Pixel[]): Box | null => {
  if (!pixels.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pixel of pixels) {
    if (pixel.x < minX) minX = pixel.x;
    if (pixel.y < minY) minY = pixel.y;
    if (pixel.x > maxX) maxX = pixel.x;
    if (pixel.y > maxY) maxY = pixel.y;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, n: pixels.length };
};

const revealed = (frame: number, range: readonly [number, number], total: number) => {
  return Math.floor(
    interpolate(frame, [range[0], range[1]], [0, total], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
};

const clampFade = (frame: number, start: number, end: number) => {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

export const OriginVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 12, 58, 82], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const appIn = spring({
    frame,
    fps,
    delay: 70,
    config: { damping: 18, mass: 0.7 },
  });
  const appOpacity = interpolate(frame, [68, 92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const batteryPixels = block(BATTERY, revealed(frame, PAINT_BATTERY, BATTERY.w * BATTERY.h));
  const clockCount = revealed(frame, PAINT_CLOCK, CLOCK.w * CLOCK.h);
  const clockPixels = block(CLOCK, clockCount);
  const clockOpacity = interpolate(frame, [HIDE[0], HIDE[1]], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const batteryBox = measure(batteryPixels);
  const clockBox = measure(clockPixels);
  const clockFull = frame >= PAINT_CLOCK[1];
  const showingClock = clockCount > 0 && clockOpacity > 0.4;
  const activeName = showingClock ? CLOCK.name : batteryPixels.length ? BATTERY.name : "No element";
  const activeBox = showingClock ? clockBox : batteryBox;

  const typed = "battery".slice(
    0,
    Math.floor(
      interpolate(frame, [96, 126], [0, 7], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    ),
  );
  const nameInField = frame < 126 ? typed : "";
  const elementListed = frame >= 126;

  const gridW = Math.round(
    interpolate(frame, [RESIZE[0], RESIZE[1]], [240, 320], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const gridH = Math.round(
    interpolate(frame, [RESIZE[0], RESIZE[1]], [135, 180], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const cursor = activeBox
    ? showingClock
      ? clockPixels[clockPixels.length - 1]
      : batteryPixels[batteryPixels.length - 1]
    : null;

  const caption = captionFor(frame);
  const placementsFocus = clampFade(frame, 540, 570);

  return (
    <AbsoluteFill
      style={{
        background: "#10140f",
        color: "#f3f6ef",
        fontFamily: '"Segoe UI", sans-serif',
      }}
    >
      <AbsoluteFill
        style={{
          opacity: titleOpacity,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TitleCard />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          opacity: appOpacity,
          transform: `scale(${interpolate(appIn, [0, 1], [0.97, 1])})`,
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 70,
        }}
      >
        <div
          style={{
            width: 1500,
            height: 820,
            display: "flex",
            flexDirection: "column",
            background: "#10140f",
            border: "1px solid #2c382c",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          }}
        >
          <Header gridW={gridW} gridH={gridH} resizing={frame >= RESIZE[0] && frame <= RESIZE[1] + 20} />
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            <Stage
              batteryPixels={batteryPixels}
              clockPixels={clockPixels}
              clockOpacity={clockFull ? clockOpacity : 1}
              activeBox={activeBox}
              cursor={cursor}
              gridW={gridW}
              gridH={gridH}
            />
            <Sidebar
              activeName={activeName}
              activeBox={activeBox}
              cursor={cursor}
              nameInField={nameInField}
              showNameField={frame < 132}
              elementListed={elementListed}
              batteryBox={batteryBox}
              clockBox={clockFull ? measure(block(CLOCK, CLOCK.w * CLOCK.h)) : clockBox}
              clockHidden={clockFull && clockOpacity < 0.5}
              placementsFocus={placementsFocus}
            />
          </div>
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 36,
          textAlign: "center",
          opacity: caption ? clampFade(frame, caption.from, caption.from + 10) * (1 - clampFade(frame, caption.until - 12, caption.until)) : 0,
          color: "#c6f135",
          fontSize: 28,
          letterSpacing: "-0.03em",
        }}
      >
        {caption?.text}
      </div>
    </AbsoluteFill>
  );
};

const captionFor = (frame: number) => {
  const lines = [
    { from: 88, until: 150, text: "Name a piece, then paint its dots." },
    { from: 190, until: 280, text: "Start is the top-left painted dot." },
    { from: 300, until: 410, text: "Draw the next piece on top." },
    { from: 420, until: 500, text: "Hide it. The one underneath keeps its start pixel." },
    { from: 530, until: 590, text: "Copy the placements." },
  ];
  return lines.find((line) => frame >= line.from && frame < line.until) ?? null;
};

const TitleCard = () => {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          color: "#c6f135",
          letterSpacing: "0.22em",
          fontSize: 16,
          textTransform: "uppercase",
        }}
      >
        Pocket display
      </div>
      <div style={{ fontSize: 112, fontWeight: 650, letterSpacing: "-0.05em", marginTop: 8 }}>Origin</div>
      <div style={{ marginTop: 18, color: "#b7c4ae", fontSize: 28 }}>One dot. One pixel.</div>
    </div>
  );
};

const Header = ({ gridW, gridH, resizing }: { gridW: number; gridH: number; resizing: boolean }) => {
  return (
    <div
      style={{
        height: 84,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        borderBottom: "1px solid #2c382c",
        background: "#161c16",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 34,
            height: 34,
            backgroundImage: "radial-gradient(circle, #c6f135 1.6px, transparent 1.7px)",
            backgroundSize: "9px 9px",
          }}
        />
        <div>
          <div style={{ color: "#c6f135", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Pocket display
          </div>
          <div style={{ fontSize: 26, fontWeight: 650, letterSpacing: "-0.04em" }}>Origin</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Consolas, monospace" }}>
        <SizeField label="Width" value={gridW} hot={resizing} />
        <span style={{ color: "#8fa18a" }}>×</span>
        <SizeField label="Height" value={gridH} hot={resizing} />
      </div>
    </div>
  );
};

const SizeField = ({ label, value, hot }: { label: string; value: number; hot: boolean }) => {
  return (
    <div>
      <div style={{ fontFamily: '"Segoe UI", sans-serif', fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa18a" }}>
        {label}
      </div>
      <div
        style={{
          minWidth: 72,
          marginTop: 4,
          padding: "6px 10px",
          borderRadius: 4,
          border: `1px solid ${hot ? "#c6f135" : "#2c382c"}`,
          background: "#10150f",
          fontSize: 18,
        }}
      >
        {value}
      </div>
    </div>
  );
};

const Stage = ({
  batteryPixels,
  clockPixels,
  clockOpacity,
  activeBox,
  cursor,
  gridW,
  gridH,
}: {
  batteryPixels: Pixel[];
  clockPixels: Pixel[];
  clockOpacity: number;
  activeBox: Box | null;
  cursor: Pixel | null;
  gridW: number;
  gridH: number;
}) => {
  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        background: "#0b0e0b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "absolute", right: 28, top: 18, color: "#8fa18a", fontSize: 14 }}>
        {gridW} × {gridH}, zoomed in
      </div>
      <div
        style={{
          position: "relative",
          width: COLS * CELL,
          height: ROWS * CELL,
          backgroundColor: "#0b0e0b",
          backgroundImage: "radial-gradient(circle, #314033 4.2px, transparent 4.6px)",
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      >
        {batteryPixels.map((pixel) => (
          <Dot key={`b-${pixel.x}-${pixel.y}`} pixel={pixel} color={BATTERY.color} />
        ))}
        <div style={{ opacity: clockOpacity }}>
          {clockPixels.map((pixel) => (
            <Dot key={`c-${pixel.x}-${pixel.y}`} pixel={pixel} color={CLOCK.color} />
          ))}
        </div>
        {activeBox ? <Outline box={activeBox} /> : null}
        {cursor ? (
          <div
            style={{
              position: "absolute",
              left: cursor.x * CELL,
              top: cursor.y * CELL,
              width: CELL,
              height: CELL,
              boxSizing: "border-box",
              border: "1px solid #f4f1e8",
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: -42,
          fontFamily: "Consolas, monospace",
          fontSize: 16,
          color: "#d5e2c8",
          background: "rgba(16,21,15,0.88)",
          border: "1px solid #2c382c",
          padding: "6px 10px",
        }}
      >
        {cursor ? `x ${cursor.x}    y ${cursor.y}` : "x —    y —"}
      </div>
    </div>
  );
};

const Dot = ({ pixel, color }: { pixel: Pixel; color: string }) => {
  const size = CELL - 4;
  return (
    <div
      style={{
        position: "absolute",
        left: pixel.x * CELL + 2,
        top: pixel.y * CELL + 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
      }}
    />
  );
};

const Outline = ({ box }: { box: Box }) => {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: box.x * CELL,
          top: box.y * CELL,
          width: box.w * CELL,
          height: box.h * CELL,
          boxSizing: "border-box",
          border: "2px solid #c6f135",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: box.x * CELL,
          top: box.y * CELL,
          width: 8,
          height: 8,
          background: "#c6f135",
        }}
      />
    </>
  );
};

const Sidebar = ({
  activeName,
  activeBox,
  cursor,
  nameInField,
  showNameField,
  elementListed,
  batteryBox,
  clockBox,
  clockHidden,
  placementsFocus,
}: {
  activeName: string;
  activeBox: Box | null;
  cursor: Pixel | null;
  nameInField: string;
  showNameField: boolean;
  elementListed: boolean;
  batteryBox: Box | null;
  clockBox: Box | null;
  clockHidden: boolean;
  placementsFocus: number;
}) => {
  const lines = placementLines(clockBox, batteryBox);
  return (
    <aside
      style={{
        width: 390,
        borderLeft: "1px solid #2c382c",
        background: "#161c16",
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div>
        <div style={labelStyle}>Cursor</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <Metric k="x" v={cursor ? String(cursor.x) : "—"} />
          <Metric k="y" v={cursor ? String(cursor.y) : "—"} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 650, letterSpacing: "-0.04em" }}>{activeName}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <Metric k="Start x" v={activeBox ? String(activeBox.x) : "—"} />
          <Metric k="Start y" v={activeBox ? String(activeBox.y) : "—"} />
          <Metric k="Width" v={activeBox ? String(activeBox.w) : "—"} />
          <Metric k="Height" v={activeBox ? String(activeBox.h) : "—"} />
        </div>
        <div style={{ marginTop: 10, color: "#8fa18a", fontSize: 13 }}>
          {activeBox ? `${activeBox.n} dots. Start is the top-left painted dot.` : "Add an element, then paint its dots."}
        </div>
      </div>
      <div>
        <div style={labelStyle}>Elements</div>
        {showNameField ? (
          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 8,
              border: "1px solid #2c382c",
              background: "#10150f",
              borderRadius: 4,
              padding: "8px 10px",
              minHeight: 20,
            }}
          >
            <span style={{ color: nameInField ? "#f3f6ef" : "#8fa18a" }}>{nameInField || "Name a piece"}</span>
            {nameInField ? <span style={{ width: 8, background: "#c6f135" }} /> : null}
          </div>
        ) : null}
        {elementListed ? (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {clockBox ? <ElementRow name="clock" box={clockBox} hidden={clockHidden} active={activeName === "clock"} /> : null}
            {batteryBox ? <ElementRow name="battery" box={batteryBox} hidden={false} active={activeName === "battery"} /> : null}
          </div>
        ) : null}
      </div>
      <div
        style={{
          marginTop: "auto",
          border: `1px solid ${placementsFocus > 0.5 ? "#c6f135" : "#2c382c"}`,
          background: "#10150f",
          padding: 12,
          transform: `scale(${1 + placementsFocus * 0.03})`,
        }}
      >
        <div style={labelStyle}>Placements</div>
        <pre
          style={{
            margin: "8px 0 0",
            fontFamily: "Consolas, monospace",
            fontSize: 15,
            lineHeight: 1.6,
            color: "#d5e2c8",
            whiteSpace: "pre-wrap",
          }}
        >
          {lines || "No elements yet."}
        </pre>
      </div>
    </aside>
  );
};

const placementLines = (clockBox: Box | null, batteryBox: Box | null) => {
  const lines: string[] = [];
  if (clockBox) lines.push(`clock  x=${clockBox.x}  y=${clockBox.y}  w=${clockBox.w}  h=${clockBox.h}`);
  if (batteryBox) lines.push(`battery  x=${batteryBox.x}  y=${batteryBox.y}  w=${batteryBox.w}  h=${batteryBox.h}`);
  return lines.join("\n");
};

const ElementRow = ({ name, box, hidden, active }: { name: string; box: Box; hidden: boolean; active: boolean }) => {
  return (
    <div
      style={{
        padding: "8px 10px",
        border: `1px solid ${active ? "#c6f135" : "transparent"}`,
        background: "#10150f",
        opacity: hidden ? 0.5 : 1,
        fontFamily: "Consolas, monospace",
        fontSize: 13,
      }}
    >
      <div style={{ fontFamily: '"Segoe UI", sans-serif', fontSize: 16 }}>{name}</div>
      {`x=${box.x}  y=${box.y}  ·  ${box.w}×${box.h}`}
      {hidden ? "  ·  hidden" : ""}
    </div>
  );
};

const Metric = ({ k, v }: { k: string; v: string }) => {
  return (
    <div style={{ background: "#10150f", border: "1px solid #2c382c", padding: "8px 10px" }}>
      <div style={labelStyle}>{k}</div>
      <div style={{ fontFamily: "Consolas, monospace", fontSize: 32, marginTop: 2 }}>{v}</div>
    </div>
  );
};

const labelStyle = {
  color: "#8fa18a",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};
