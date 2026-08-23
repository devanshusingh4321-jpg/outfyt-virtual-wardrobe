import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import Stage from "@/components/film/scene";
import Overlays from "@/components/film/Overlays";
import { S, ACT_AXIS, clamp01 } from "@/lib/film/core";

const TRACK_VH = 2200;

const BrandNewDay = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [mobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 720);

  useEffect(() => {
    S.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // write p to a plain mutable object once per frame; React never re-renders
    let raf = 0;
    const read = () => {
      const el = trackRef.current;
      if (el) {
        const total = el.scrollHeight - window.innerHeight;
        S.p = clamp01(total > 0 ? window.scrollY / total : 0);
        S.sp = clamp01(S.p / ACT_AXIS);
      }
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);

    const onMove = (e: PointerEvent) => {
      S.mx = (e.clientX / window.innerWidth) * 2 - 1;
      S.my = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={trackRef} className="film-track" style={{ height: `${TRACK_VH}vh` }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <Canvas
          camera={{ position: [0, 10.5, 54], fov: 42, near: 0.1, far: 600 }}
          dpr={mobile ? 1 : 1.5}
          gl={{ antialias: !mobile, powerPreference: "high-performance" }}
        >
          <Suspense fallback={null}>
            <Stage mobile={mobile} />
          </Suspense>
        </Canvas>
        <Overlays />
      </div>
    </div>
  );
};

export default BrandNewDay;
