import { Easing, interpolate, spring } from "remotion";

export const FPS = 30;
export const DURATION = 2520;

const CELL = 13;
export const GRID_COLS = 50;
export const GRID_ROWS = 24;
export { CELL };

const BATTERY = { name: "battery", x: 6, y: 8, w: 16, h: 9, color: "#c6f135" };
const CLOCK = { name: "clock", x: 16, y: 5, w: 12, h: 8, color: "#f4f1e8" };

const ADD_BATTERY = 1360;
const PAINT_BATTERY: [number, number] = [1400, 1560];
const ADD_CLOCK = 1700;
const PAINT_CLOCK: [number, number] = [1730, 1860];
const HIDE: [number, number] = [1856, 1940];
const RESIZE: [number, number] = [2040, 2140];
const COPY: [number, number] = [2180, 2280];

export type Dot = { x: number; y: number; color: string; opacity: number };

export type ElementRow = {
  name: string;
  meta: string;
  active: boolean;
  hidden: boolean;
  hideLabel: string;
  forwardDisabled: boolean;
  backDisabled: boolean;
};

export type FilmModel = {
  yaw: number;
  pitch: number;
  dolly: number;
  separate: number;
  sceneOpacity: number;
  openingOpacity: number;
  titleOpacity: number;
  endOpacity: number;
  parts: {
    stage: number;
    header: number;
    tools: number;
    readout: number;
    elements: number;
    placements: number;
  };
  gridW: number;
  gridH: number;
  tool: "pencil" | "eraser" | "rect" | "pan";
  color: string;
  nameField: string;
  rows: ElementRow[];
  placements: string;
  dots: Dot[];
  origin: { x: number; y: number } | null;
  cursor: { x: number; y: number } | null;
  readout: { name: string; x: string; y: string; w: string; h: string; detail: string };
  floatCursor: string;
  status: string;
  hint: string | null;
  flash: "readout" | "size" | "copy" | null;
  caption: string | null;
  captionOpacity: number;
};

const ease = Easing.inOut(Easing.cubic);

const seg = (frame: number, a: number, b: number, from: number, to: number) =>
  interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const ramp = (frame: number, stops: ReadonlyArray<readonly [number, number]>) => {
  if (frame <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i += 1) {
    if (frame <= stops[i][0]) return seg(frame, stops[i - 1][0], stops[i][0], stops[i - 1][1], stops[i][1]);
  }
  return stops[stops.length - 1][1];
};

const arrive = (frame: number, start: number) =>
  spring({
    frame: Math.max(0, frame - start),
    fps: FPS,
    config: { damping: 22, mass: 0.9, stiffness: 70 },
  });

const countBetween = (frame: number, range: readonly [number, number], total: number) =>
  Math.floor(
    interpolate(frame, [range[0], range[1]], [0, total], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

const fill = (
  origin: { x: number; y: number; w: number; h: number },
  count: number,
  color: string,
  opacity: number,
): Dot[] => {
  const dots: Dot[] = [];
  const shown = Math.max(0, Math.min(origin.w * origin.h, count));
  for (let i = 0; i < shown; i += 1) {
    dots.push({
      x: origin.x + (i % origin.w),
      y: origin.y + Math.floor(i / origin.w),
      color,
      opacity,
    });
  }
  return dots;
};

const measured = (origin: { x: number; y: number; w: number; h: number }, count: number) => {
  if (count <= 0) return null;
  const last = Math.min(origin.w * origin.h, count) - 1;
  const maxX = origin.x + (last % origin.w);
  const maxY = origin.y + Math.floor(last / origin.w);
  return {
    x: origin.x,
    y: origin.y,
    w: maxX - origin.x + 1,
    h: maxY - origin.y + 1,
    n: last + 1,
  };
};

const line = (name: string, box: { x: number; y: number; w: number; h: number } | null) =>
  box ? `${name}  x=${box.x}  y=${box.y}  w=${box.w}  h=${box.h}` : `${name}  (empty)`;

const typed = (frame: number, word: string, start: number) => {
  const letters = Math.floor(
    interpolate(frame, [start, start + word.length * 4], [0, word.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return word.slice(0, letters);
};

const fadeCaption = (frame: number, start: number, end: number) => {
  const inn = interpolate(frame, [start, start + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const out = interpolate(frame, [end - 12, end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return Math.min(inn, out);
};

export const modelAt = (frame: number): FilmModel => {
  const batteryCount = frame < ADD_BATTERY ? 0 : countBetween(frame, PAINT_BATTERY, BATTERY.w * BATTERY.h);
  const clockCount = frame < ADD_CLOCK ? 0 : countBetween(frame, PAINT_CLOCK, CLOCK.w * CLOCK.h);
  const clockOpacity = interpolate(frame, HIDE, [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const batteryBox = measured(BATTERY, batteryCount);
  const clockBox = measured(CLOCK, clockCount);
  const clockHidden = frame >= HIDE[1];
  const showingClock = clockCount > 0 && !clockHidden;
  const paintingClock = frame >= PAINT_CLOCK[0] && frame <= PAINT_CLOCK[1];
  const paintingBattery = frame >= PAINT_BATTERY[0] && frame <= PAINT_BATTERY[1];

  const active = showingClock ? CLOCK : batteryCount > 0 || frame >= ADD_BATTERY ? BATTERY : null;
  const activeBox = active === CLOCK ? clockBox : active === BATTERY ? batteryBox : null;

  const dots = [
    ...fill(BATTERY, batteryCount, BATTERY.color, 1),
    ...fill(CLOCK, clockCount, CLOCK.color, clockOpacity),
  ];

  let cursor: { x: number; y: number } | null = null;
  if (paintingBattery && batteryCount > 0) {
    const last = batteryCount - 1;
    cursor = { x: BATTERY.x + (last % BATTERY.w), y: BATTERY.y + Math.floor(last / BATTERY.w) };
  } else if (paintingClock && clockCount > 0) {
    const last = clockCount - 1;
    cursor = { x: CLOCK.x + (last % CLOCK.w), y: CLOCK.y + Math.floor(last / CLOCK.w) };
  }

  const rows: ElementRow[] = [];
  if (frame >= ADD_CLOCK) {
    rows.push({
      name: CLOCK.name,
      meta: clockBox ? `x=${clockBox.x}  y=${clockBox.y}  ·  ${clockBox.w}×${clockBox.h}` : "empty",
      active: showingClock,
      hidden: clockHidden,
      hideLabel: clockHidden ? "Show" : "Hide",
      forwardDisabled: true,
      backDisabled: false,
    });
  }
  if (frame >= ADD_BATTERY) {
    rows.push({
      name: BATTERY.name,
      meta: batteryBox ? `x=${batteryBox.x}  y=${batteryBox.y}  ·  ${batteryBox.w}×${batteryBox.h}` : "empty",
      active: !showingClock,
      hidden: false,
      hideLabel: "Hide",
      forwardDisabled: frame < ADD_CLOCK,
      backDisabled: true,
    });
  }

  const placementLines: string[] = [];
  if (frame >= ADD_CLOCK) placementLines.push(line(CLOCK.name, clockBox));
  if (frame >= ADD_BATTERY) placementLines.push(line(BATTERY.name, batteryBox));

  const nameWhileTyping =
    frame < ADD_BATTERY ? typed(frame, "battery", 1288) : frame < ADD_CLOCK ? typed(frame, "clock", 1628) : "";

  const gridW = Math.round(ramp(frame, [[0, 240], [RESIZE[0], 240], [RESIZE[0] + 50, 160], [DURATION, 160]]));
  const gridH = Math.round(ramp(frame, [[0, 135], [RESIZE[0], 135], [RESIZE[0] + 50, 90], [DURATION, 90]]));

  const captions: { start: number; end: number; text: string }[] = [
    { start: 1280, end: 1560, text: "Name a piece, then paint its dots." },
    { start: 1620, end: 1848, text: "Draw the next piece on top." },
    { start: 1856, end: 2010, text: "Hide it. The one underneath keeps its start." },
    { start: 2030, end: 2160, text: "Set the width and height." },
    { start: 2170, end: 2300, text: "Copy the placements." },
  ];
  const caption = captions.find((item) => frame >= item.start && frame <= item.end) ?? null;

  let flash: FilmModel["flash"] = null;
  if (frame >= 1480 && frame < 1620 && batteryBox) flash = "readout";
  else if (frame >= RESIZE[0] && frame < RESIZE[1]) flash = "size";
  else if (frame >= COPY[0] && frame < COPY[1] + 40) flash = "copy";

  let status = "";
  if (frame >= RESIZE[0] + 55 && frame < COPY[0]) status = `Grid is ${gridW}×${gridH}.`;
  if (frame >= COPY[0] + 24) status = "Copied placements.";

  const detail = activeBox
    ? `${activeBox.n} ${activeBox.n === 1 ? "dot" : "dots"}. Start is the top-left painted dot.`
    : frame >= ADD_BATTERY
      ? "No dots yet. Start is the top-left painted dot."
      : "Add an element, then paint its dots. Start is the top-left painted dot.";

  return {
    yaw: ramp(frame, [[0, 36], [380, 36], [1160, 6], [1280, 0], [2300, 0], [2480, 16]]),
    pitch: ramp(frame, [[0, 5], [380, 5], [1160, 2], [1280, 0], [2300, 0], [2480, 3]]),
    dolly: ramp(frame, [[380, -240], [1160, 10], [1280, 100], [1560, 140], [1680, 110], [1900, 130], [2140, 100], [2300, 110], [2480, -50]]),
    separate: ramp(frame, [[2300, 0], [2420, 1]]),
    sceneOpacity: ramp(frame, [[340, 0], [460, 1]]),
    openingOpacity: ramp(frame, [[0, 1], [360, 1], [500, 0]]),
    titleOpacity: ramp(frame, [[120, 0], [170, 1], [340, 1], [430, 0]]),
    endOpacity: ramp(frame, [[2340, 0], [2440, 1]]),
    parts: {
      stage: frame < 400 ? 0 : arrive(frame, 400),
      header: frame < 480 ? 0 : arrive(frame, 480),
      tools: frame < 560 ? 0 : arrive(frame, 560),
      readout: frame < 640 ? 0 : arrive(frame, 640),
      elements: frame < 730 ? 0 : arrive(frame, 730),
      placements: frame < 820 ? 0 : arrive(frame, 820),
    },
    gridW,
    gridH,
    tool: paintingBattery || paintingClock ? "rect" : "pencil",
    color: paintingClock || showingClock ? CLOCK.color : paintingBattery || batteryCount > 0 ? BATTERY.color : "#f4f1e8",
    nameField: nameWhileTyping,
    rows,
    placements: placementLines.length ? placementLines.join("\n") : "No elements yet.",
    dots,
    origin: activeBox ? { x: activeBox.x, y: activeBox.y } : null,
    cursor,
    readout: {
      name: active ? active.name : "No element",
      x: activeBox ? String(activeBox.x) : "—",
      y: activeBox ? String(activeBox.y) : "—",
      w: activeBox ? String(activeBox.w) : "—",
      h: activeBox ? String(activeBox.h) : "—",
      detail,
    },
    floatCursor: cursor ? `x ${cursor.x}    y ${cursor.y}` : "x —    y —",
    status,
    hint: frame < ADD_BATTERY ? "Add an element, then paint its dots." : null,
    flash,
    caption: caption ? caption.text : null,
    captionOpacity: caption ? fadeCaption(frame, caption.start, caption.end) : 0,
  };
};
