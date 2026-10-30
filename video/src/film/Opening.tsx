import { useLayoutEffect, useMemo } from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const CARDS: { position: [number, number, number]; rotation: [number, number, number]; size: [number, number] }[] = [
  { position: [-2.5, 0.25, -0.2], rotation: [0.04, 0.72, 0], size: [2.3, 1.4] },
  { position: [2.1, -0.2, -2.6], rotation: [0.02, -0.45, 0], size: [1.7, 2.15] },
  { position: [-0.8, 0.85, -5.1], rotation: [0.08, 0.28, 0], size: [3.0, 1.7] },
  { position: [3.0, 1.05, -7.2], rotation: [0, -0.55, 0], size: [1.6, 1.15] },
];

const CameraRig = () => {
  const frame = useCurrentFrame();
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    const glide = interpolate(frame, [0, 420], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    camera.position.set(
      interpolate(glide, [0, 1], [6.8, 1.35]),
      interpolate(glide, [0, 1], [1.15, 0.42]),
      interpolate(glide, [0, 1], [6.4, 3.6]),
    );
    camera.lookAt(0.1, 0.15, -2.2);
    camera.updateProjectionMatrix();
  }, [camera, frame]);
  return null;
};

const DotField = () => {
  const positions = useMemo(() => {
    const count = 380;
    const values = new Float32Array(count * 3);
    let seed = 19;
    const next = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i += 1) {
      values[i * 3] = (next() - 0.5) * 16;
      values[i * 3 + 1] = (next() - 0.45) * 8;
      values[i * 3 + 2] = -next() * 16;
    }
    return values;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d5e7a6" size={0.028} sizeAttenuation transparent opacity={0.55} />
    </points>
  );
};

const CardTexture = ({ accent }: { accent: boolean }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 200;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#161c16";
    context.fillRect(0, 0, 320, 200);
    context.fillStyle = accent ? "#c6f135" : "#314033";
    for (let y = 14; y < 190; y += 12) {
      for (let x = 14; x < 306; x += 12) {
        context.beginPath();
        context.arc(x, y, accent && y < 40 ? 1.8 : 1.15, 0, Math.PI * 2);
        context.fill();
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.needsUpdate = true;
    return map;
  }, [accent]);

  if (!texture) return <meshBasicMaterial color="#161c16" />;
  return <meshStandardMaterial map={texture} roughness={0.82} metalness={0.04} />;
};

export const Opening = () => {
  return (
    <ThreeCanvas
      width={1920}
      height={1080}
      camera={{ fov: 32, near: 0.1, far: 40, position: [6.8, 1.15, 6.4] }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#070a08"]} />
      <fog attach="fog" args={["#070a08", 5, 16]} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[6, 4, 5]} intensity={1.15} color="#f3f6ef" />
      <directionalLight position={[-4, 1, 2]} intensity={0.45} color="#c6f135" />
      <CameraRig />
      <DotField />
      {CARDS.map((card, index) => (
        <mesh key={index} position={card.position} rotation={card.rotation}>
          <planeGeometry args={card.size} />
          <CardTexture accent={index === 0} />
        </mesh>
      ))}
    </ThreeCanvas>
  );
};
