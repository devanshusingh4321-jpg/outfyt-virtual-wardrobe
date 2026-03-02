import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Sparkles } from "@react-three/drei";
import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";

const NeonRing = ({ radius, color, speed, wobble }: { radius: number; color: string; speed: number; wobble: number }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.3) * 0.3;
    ref.current.rotation.y += speed * 0.004;
    ref.current.rotation.z = Math.cos(state.clock.elapsedTime * speed * 0.2) * 0.15;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.04, 16, 100]} />
      <MeshWobbleMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        factor={wobble}
        speed={speed * 0.7}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
};

const GlowSphere = () => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.6) * 0.06);
  });
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.9, 4]} />
        <MeshDistortMaterial
          color="#0099ff"
          emissive="#0088ff"
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.8}
          distort={0.3}
          speed={1.5}
          transparent
          opacity={0.25}
        />
      </mesh>
    </Float>
  );
};

const FloatingDiamond = ({ position, color, scale, speed }: { position: [number, number, number]; color: string; scale: number; speed: number }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    ref.current.rotation.y += 0.008 * speed;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.4) * 0.4;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.25;
  });
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        transparent
        opacity={0.6}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  );
};

const ParticleField = () => {
  const count = 60;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return pos;
  }, []);

  const ref = useRef<THREE.Points>(null!);
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#00aaff"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
};

const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[3, 3, 3]} intensity={0.8} color="#0088ff" />
      <pointLight position={[-3, -2, 2]} intensity={0.5} color="#00bbff" />
      <pointLight position={[0, 2, -3]} intensity={0.3} color="#0066cc" />

      <GlowSphere />

      <NeonRing radius={1.6} color="#0088ff" speed={0.8} wobble={0.25} />
      <NeonRing radius={2.0} color="#00aaff" speed={0.5} wobble={0.15} />
      <NeonRing radius={2.4} color="#0066cc" speed={0.35} wobble={0.1} />

      <FloatingDiamond position={[2.2, 1, -1]} color="#0088ff" scale={0.5} speed={0.9} />
      <FloatingDiamond position={[-2, -0.8, -0.5]} color="#00aaff" scale={0.4} speed={0.7} />
      <FloatingDiamond position={[1.5, -1.5, 0.5]} color="#0066cc" scale={0.35} speed={1.1} />

      <ParticleField />

      <Sparkles
        count={40}
        size={1.5}
        scale={6}
        speed={0.3}
        color="#00aaff"
        opacity={0.4}
      />
    </>
  );
};

const HeroScene = () => {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HeroScene;
