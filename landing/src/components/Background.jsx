import { useEffect, useRef } from 'react';
import './Background.css';

export default function Background() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * 3 * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Floating particles
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight * 3,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.15 + 0.05,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      time += 0.003;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // Dot grid
      const gap = 40;
      for (let x = 0; x < w; x += gap) {
        for (let y = 0; y < h; y += gap) {
          const dist = Math.sqrt((x - w / 2) ** 2 + (y - h * 0.15) ** 2);
          const alpha = Math.max(0.015, 0.06 - dist * 0.00003);
          const pulse = 0.5 + 0.5 * Math.sin(time * 2 + x * 0.01 + y * 0.01);
          ctx.fillStyle = `rgba(181,163,247,${alpha * (0.6 + pulse * 0.4)})`;
          ctx.beginPath();
          ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Floating particles
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        const alpha = 0.15 + 0.1 * Math.sin(time * 3 + p.phase);
        ctx.fillStyle = `rgba(181,163,247,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(time + p.phase) * 8, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="bg-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="bg-layer__canvas" />
      <div className="bg-layer__gradient bg-layer__gradient--hero" />
      <div className="bg-layer__gradient bg-layer__gradient--mid" />
    </div>
  );
}
