import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  age: number;
}

const CursorThread = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      pointsRef.current.push({ x: e.clientX, y: e.clientY, age: 0 });
      if (pointsRef.current.length > 80) pointsRef.current.shift();
    };
    window.addEventListener("mousemove", handleMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const points = pointsRef.current;

      // Age and remove old points
      for (let i = points.length - 1; i >= 0; i--) {
        points[i].age += 1;
        if (points[i].age > 60) {
          points.splice(i, 1);
        }
      }

      if (points.length < 2) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Draw smooth thread
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      const lastP = points[points.length - 1];
      ctx.lineTo(lastP.x, lastP.y);

      // Shimmering gradient along the thread
      const grad = ctx.createLinearGradient(
        points[0].x, points[0].y,
        lastP.x, lastP.y
      );
      grad.addColorStop(0, "hsla(200, 100%, 50%, 0)");
      grad.addColorStop(0.3, "hsla(200, 100%, 60%, 0.15)");
      grad.addColorStop(0.6, "hsla(200, 80%, 70%, 0.25)");
      grad.addColorStop(1, "hsla(200, 100%, 50%, 0.4)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Glow layer
      ctx.strokeStyle = "hsla(200, 100%, 60%, 0.08)";
      ctx.lineWidth = 6;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    />
  );
};

export default CursorThread;
