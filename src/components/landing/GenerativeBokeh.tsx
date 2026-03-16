import { useEffect, useRef } from "react";

interface BokehCircle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
}

const GenerativeBokeh = ({ scrollProgress = 0 }: { scrollProgress: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const circlesRef = useRef<BokehCircle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth * 2;
      canvas.height = window.innerHeight * 2;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    };
    resize();
    window.addEventListener("resize", resize);

    // Create bokeh circles
    const count = 35;
    circlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 20 + Math.random() * 80,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      hue: 200 + Math.random() * 30,
      alpha: 0.03 + Math.random() * 0.06,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.005 + Math.random() * 0.01,
    }));

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const circles = circlesRef.current;

    // Color palettes based on scroll: warm autumn → cool neon → luxe gold
    const getHueShift = (progress: number) => {
      if (progress < 0.33) return 30 + progress * 3 * 170; // warm orange → blue
      if (progress < 0.66) return 200 + (progress - 0.33) * 3 * 80; // blue → cyan/neon
      return 280 + (progress - 0.66) * 3 * 60; // purple → magenta
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const hueShift = getHueShift(scrollProgress);

      circles.forEach((c) => {
        c.x += c.vx;
        c.y += c.vy;
        c.pulse += c.pulseSpeed;

        if (c.x < -c.r) c.x = canvas.width + c.r;
        if (c.x > canvas.width + c.r) c.x = -c.r;
        if (c.y < -c.r) c.y = canvas.height + c.r;
        if (c.y > canvas.height + c.r) c.y = -c.r;

        const currentAlpha = c.alpha * (0.7 + Math.sin(c.pulse) * 0.3);
        const hue = (c.hue + hueShift) % 360;
        const currentR = c.r * (0.9 + Math.sin(c.pulse * 0.7) * 0.1);

        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, currentR);
        grad.addColorStop(0, `hsla(${hue}, 80%, 60%, ${currentAlpha * 1.5})`);
        grad.addColorStop(0.5, `hsla(${hue}, 70%, 50%, ${currentAlpha * 0.8})`);
        grad.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);

        ctx.beginPath();
        ctx.arc(c.x, c.y, currentR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [scrollProgress]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, filter: "blur(40px)" }}
    />
  );
};

export default GenerativeBokeh;
