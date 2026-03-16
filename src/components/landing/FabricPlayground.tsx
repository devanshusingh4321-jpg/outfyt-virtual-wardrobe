import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const COLS = 28;
const ROWS = 28;
const SPACING = 12;
const DAMPING = 0.94;
const SPREAD = 0.2;

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
}

const FabricPlayground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[][]>([]);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1, y: -1, active: false });

  const initNodes = useCallback((w: number, h: number) => {
    const offsetX = (w - (COLS - 1) * SPACING) / 2;
    const offsetY = (h - (ROWS - 1) * SPACING) / 2;
    const grid: Node[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: Node[] = [];
      for (let c = 0; c < COLS; c++) {
        const x = offsetX + c * SPACING;
        const y = offsetY + r * SPACING;
        row.push({ x, y, baseX: x, baseY: y, vx: 0, vy: 0 });
      }
      grid.push(row);
    }
    nodesRef.current = grid;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio, 2);

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    initNodes(rect.width, rect.height);

    const handlePointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        active: true,
      };
    };
    const handleLeave = () => { mouseRef.current.active = false; };

    canvas.addEventListener("pointermove", handlePointer);
    canvas.addEventListener("pointerleave", handleLeave);

    const draw = () => {
      const grid = nodesRef.current;
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // Apply mouse force
      if (mouseRef.current.active) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const radius = 60;
        for (const row of grid) {
          for (const n of row) {
            const dx = n.x - mx;
            const dy = n.y - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < radius && dist > 0) {
              const force = (1 - dist / radius) * 3;
              n.vx += (dx / dist) * force;
              n.vy += (dy / dist) * force;
            }
          }
        }
      }

      // Physics: spring back + neighbor spread
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const n = grid[r][c];
          // Spring to base
          n.vx += (n.baseX - n.x) * 0.04;
          n.vy += (n.baseY - n.y) * 0.04;
          // Neighbor influence
          const neighbors = [
            r > 0 ? grid[r - 1][c] : null,
            r < ROWS - 1 ? grid[r + 1][c] : null,
            c > 0 ? grid[r][c - 1] : null,
            c < COLS - 1 ? grid[r][c + 1] : null,
          ];
          for (const nb of neighbors) {
            if (!nb) continue;
            n.vx += (nb.x - nb.baseX - (n.x - n.baseX)) * SPREAD * 0.1;
            n.vy += (nb.y - nb.baseY - (n.y - n.baseY)) * SPREAD * 0.1;
          }
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        }
      }

      // Draw fabric mesh
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const n = grid[r][c];
          const displaceAmt = Math.sqrt(
            (n.x - n.baseX) ** 2 + (n.y - n.baseY) ** 2
          );
          const intensity = Math.min(displaceAmt / 20, 1);
          const hue = 200 + intensity * 40;
          const alpha = 0.15 + intensity * 0.4;

          // Horizontal line
          if (c < COLS - 1) {
            const next = grid[r][c + 1];
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
          // Vertical line
          if (r < ROWS - 1) {
            const next = grid[r + 1][c];
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }

          // Node glow
          if (intensity > 0.1) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, 1.5 + intensity * 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${intensity * 0.6})`;
            ctx.fill();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      canvas.removeEventListener("pointermove", handlePointer);
      canvas.removeEventListener("pointerleave", handleLeave);
      cancelAnimationFrame(animRef.current);
    };
  }, [initNodes]);

  return (
    <motion.div
      className="relative glass rounded-2xl overflow-hidden"
      style={{ width: "100%", maxWidth: 420, aspectRatio: "1" }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ touchAction: "none" }}
      />
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
          Touch the fabric
        </p>
      </div>
    </motion.div>
  );
};

export default FabricPlayground;
