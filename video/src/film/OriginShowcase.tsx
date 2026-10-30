import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Chrome } from "./Chrome";
import { Opening } from "./Opening";
import { DURATION, FPS, modelAt } from "./model";

export const SHOWCASE_FPS = FPS;
export const SHOWCASE_DURATION = DURATION;

const bedVolume = (frame: number) =>
  interpolate(frame, [0, 40, 2420, 2520], [0, 0.07, 0.07, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const OriginShowcase = () => {
  const frame = useCurrentFrame();
  const model = modelAt(frame);

  return (
    <AbsoluteFill style={{ background: "#070a08", fontFamily: '"Segoe UI", sans-serif' }}>
      {frame < 520 ? (
        <AbsoluteFill style={{ opacity: model.openingOpacity }}>
          <Opening />
          <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 120px 150px", opacity: model.titleOpacity }}>
            <p style={{ margin: 0, color: "#c6f135", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 18 }}>
              Pocket display
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: 96, fontWeight: 560, letterSpacing: "-0.045em", color: "#f3f6ef" }}>Origin</h1>
            <div
              style={{
                marginTop: 18,
                height: 2,
                width: 180,
                background: "#c6f135",
                transform: `scaleX(${model.titleOpacity})`,
                transformOrigin: "left center",
              }}
            />
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{ opacity: model.sceneOpacity, perspective: 1500, perspectiveOrigin: "50% 46%", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            transform: `translate3d(0, 0, ${model.dolly}px) rotateX(${model.pitch}deg) rotateY(${model.yaw}deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Chrome model={model} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 42, pointerEvents: "none" }}>
        {model.caption ? (
          <div
            style={{
              opacity: model.captionOpacity,
              background: "rgba(16,20,15,0.88)",
              border: "1px solid #2c382c",
              color: "#f3f6ef",
              fontSize: 28,
              letterSpacing: "-0.02em",
              padding: "12px 22px",
            }}
          >
            {model.caption}
          </div>
        ) : null}
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: model.endOpacity, justifyContent: "flex-end", alignItems: "flex-start", padding: "0 0 64px 88px" }}>
        <div>
          <p style={{ margin: 0, color: "#c6f135", letterSpacing: "0.18em", textTransform: "uppercase", fontSize: 15 }}>Pocket display</p>
          <h1 style={{ margin: "6px 0 0", fontSize: 72, fontWeight: 560, letterSpacing: "-0.045em", color: "#f3f6ef" }}>Origin</h1>
          <p style={{ margin: "8px 0 0", color: "#b7c4ae", fontSize: 20 }}>Start is the top-left painted dot.</p>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "radial-gradient(circle at center, transparent 45%, rgba(0,0,0,0.45) 100%)", pointerEvents: "none" }} />

      <Audio src={staticFile("audio/bed.wav")} volume={bedVolume} />
      <Sequence from={70}>
        <Audio src={staticFile("audio/n1.mp3")} volume={1} />
      </Sequence>
      <Sequence from={500}>
        <Audio src={staticFile("audio/n2.mp3")} volume={1} />
      </Sequence>
      <Sequence from={1290}>
        <Audio src={staticFile("audio/n3.mp3")} volume={1} />
      </Sequence>
      <Sequence from={1695}>
        <Audio src={staticFile("audio/n4.mp3")} volume={1} />
      </Sequence>
      <Sequence from={2065}>
        <Audio src={staticFile("audio/n5.mp3")} volume={1} />
      </Sequence>
      <Sequence from={2370}>
        <Audio src={staticFile("audio/n6.mp3")} volume={1} />
      </Sequence>
      <Sequence from={390}>
        <Audio src={staticFile("audio/whoosh.wav")} volume={0.4} />
      </Sequence>
      <Sequence from={1120}>
        <Audio src={staticFile("audio/whoosh.wav")} volume={0.28} />
      </Sequence>
      <Sequence from={2310}>
        <Audio src={staticFile("audio/whoosh.wav")} volume={0.32} />
      </Sequence>
      {[430, 520, 640, 750, 850].map((start) => (
        <Sequence key={start} from={start}>
          <Audio src={staticFile("audio/impact.wav")} volume={0.34} />
        </Sequence>
      ))}
      <Sequence from={2470}>
        <Audio src={staticFile("audio/impact.wav")} volume={0.4} />
      </Sequence>
    </AbsoluteFill>
  );
};
