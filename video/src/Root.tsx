import { Composition } from "remotion";
import { OriginVideo, VIDEO_DURATION, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "./OriginVideo";
import { OriginShowcase, SHOWCASE_DURATION, SHOWCASE_FPS } from "./film/OriginShowcase";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Origin"
        component={OriginVideo}
        durationInFrames={VIDEO_DURATION}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="OriginShowcase"
        component={OriginShowcase}
        durationInFrames={SHOWCASE_DURATION}
        fps={SHOWCASE_FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
