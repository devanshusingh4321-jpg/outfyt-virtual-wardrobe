import { useEffect, useRef } from "react";
import { S, smoothstep, clamp01 } from "@/lib/film/core";

/* Copy: two phrases, repeated, and nothing else but the title. */
type Cue = {
  text: string;
  a: number; // open on the ACT axis (or real p when axis === "p")
  b: number;
  dir: "out" | "in"; // openings leave back-to-front, closings arrive front-to-back
  size: string;
  axis?: "sp" | "p";
};

const CUES: Cue[] = [
  { text: "BRAND NEW DAY", a: -0.06, b: 0.2, dir: "out", size: "clamp(2.2rem,9vw,7rem)" },
  { text: "IT COMES BACK", a: 0.17, b: 0.33, dir: "out", size: "clamp(1.1rem,4vw,2.6rem)" },
  { text: "NOTHING HELD", a: 0.34, b: 0.5, dir: "in", size: "clamp(1.1rem,4vw,2.6rem)" },
  { text: "IT COMES BACK", a: 0.52, b: 0.68, dir: "out", size: "clamp(1.1rem,4vw,2.6rem)" },
  { text: "NOTHING HELD", a: 0.68, b: 0.84, dir: "in", size: "clamp(1.1rem,4vw,2.6rem)" },
  { text: "BRAND NEW DAY", a: 0.78, b: 1.06, dir: "in", size: "clamp(2rem,8vw,6rem)", axis: "p" },
];


const Overlays = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-cue]"));
    let raf = 0;

    const tick = () => {
      // overlay windows run on the ACT axis, not on real p
      for (const layer of layers) {
        const a = parseFloat(layer.dataset.a!);
        const b = parseFloat(layer.dataset.b!);
        const dir = layer.dataset.dir as "out" | "in";
        const v = layer.dataset.axis === "p" ? S.p : S.sp;
        const span = b - a;
        const o = smoothstep(a, a + span * 0.28, v) * (1 - smoothstep(b - span * 0.28, b, v));
        layer.style.opacity = String(o);
        layer.style.visibility = o < 0.01 ? "hidden" : "visible";

        if (o < 0.01) continue;

        const letters = layer.querySelectorAll<HTMLElement>("[data-l]");
        const n = letters.length;
        letters.forEach((el, i) => {
          const idx = parseInt(el.dataset.l!, 10);
          const order = dir === "out" ? n - 1 - idx : idx; // back-to-front vs front-to-back
          const stagger = order / Math.max(1, n - 1);
          const local = clamp01((o - stagger * 0.35) / 0.65);
          const dz = dir === "out" ? (1 - local) * -180 : (1 - local) * 180;
          const blur = (1 - local) * 9;
          el.style.transform = `translate3d(0,${(1 - local) * (dir === "out" ? -14 : 14)}px,${dz}px)`;
          el.style.filter = `blur(${blur}px)`;
          el.style.opacity = String(0.15 + local * 0.85);
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden" style={{ pointerEvents: "none" }}>
      {CUES.map((cue, i) => (
        <div
          key={`${cue.text}-${i}`}
          data-cue
          data-a={cue.a}
          data-b={cue.b}
          data-dir={cue.dir}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            pointerEvents: "none",
            opacity: 0,
            visibility: "hidden",
            perspective: "900px",
            padding: "0 1.25rem",
          }}
        >
          <h1
            className="font-display font-bold text-center leading-none tracking-tight"
            style={{
              fontSize: cue.size,
              color: "hsl(var(--film-bone))",
              letterSpacing: "-0.02em",
              textWrap: "balance",
              maxWidth: "100%",
            }}
          >
            {cue.text.split("").map((ch, j) => (
              <span
                key={j}
                data-l={j}
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  willChange: "transform, filter, opacity",
                  backfaceVisibility: "hidden",
                  transformStyle: "preserve-3d",
                }}
              >
                {ch}
              </span>
            ))}
          </h1>
        </div>
      ))}
    </div>
  );
};

export default Overlays;
