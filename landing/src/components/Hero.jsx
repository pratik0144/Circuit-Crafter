import { useEffect, useRef, useState } from 'react';
import './Hero.css';

export default function Hero() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const powerRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      time += 0.015;
      
      // Smoothly interpolate power
      const targetPower = isHovered ? 1 : 0;
      powerRef.current += (targetPower - powerRef.current) * 0.05;
      const p = powerRef.current;
      
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // --- 1. Background Grid (Inactive -> Active) ---
      ctx.lineWidth = 1;
      const gap = 30;
      ctx.strokeStyle = `rgba(181, 163, 247, ${0.02 + p * 0.04})`;
      
      for (let x = 0; x < w; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cx = w * 0.5;
      const cy = h * 0.5 + 10;
      
      // --- 2. Morph phase logic ---
      // p = 0 to 0.5: Energy flow, nodes lighting up
      // p = 0.5 to 1.0: Morph to clean editable UI
      
      const energyPhase = Math.min(1, p * 2); 
      const uiPhase = Math.max(0, (p - 0.5) * 2);

      // Roughness factor (decreases as it morphs to UI)
      const roughness = (1 - uiPhase) * 3;

      const drawRoughLine = (x1, y1, x2, y2) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const segments = 4;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const currX = x1 + (x2 - x1) * t;
          const currY = y1 + (y2 - y1) * t;
          const rx = (Math.random() - 0.5) * roughness;
          const ry = (Math.random() - 0.5) * roughness;
          ctx.lineTo(currX + rx, currY + ry);
        }
        ctx.stroke();
      };

      // Styles
      const inactiveColor = 'rgba(100, 100, 130, 0.3)';
      const activeColor = '#b5a3f7';
      const activeGlow = 'rgba(181, 163, 247, 0.4)';
      
      // We mix the stroke style based on energyPhase
      const wireAlpha = 0.3 + energyPhase * 0.7;
      const glowBlur = energyPhase * 10;
      
      ctx.shadowBlur = glowBlur;
      ctx.shadowColor = activeGlow;
      ctx.lineWidth = 1.5 + uiPhase * 0.5;

      const setWireStyle = () => {
        if (energyPhase < 0.1) {
          ctx.strokeStyle = inactiveColor;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = `rgba(181, 163, 247, ${wireAlpha})`;
          ctx.shadowBlur = glowBlur;
        }
      };

      // Wires geometry
      const nodes = {
        tl: [cx - 120, cy - 60],
        tr: [cx + 120, cy - 60],
        ml: [cx - 120, cy],
        mr: [cx + 120, cy],
        bl: [cx - 120, cy + 60],
        br: [cx + 120, cy + 60]
      };

      setWireStyle();
      
      // Top row
      drawRoughLine(nodes.tl[0], nodes.tl[1], cx - 20, cx - 60); // Left to battery
      drawRoughLine(cx + 20, nodes.tr[1], nodes.tr[0], nodes.tr[1]); // Battery to right
      
      // Middle row (resistor)
      drawRoughLine(nodes.ml[0], nodes.ml[1], cx - 50, cy);
      drawRoughLine(cx + 50, nodes.mr[1], nodes.mr[0], nodes.mr[1]);
      
      // Bottom row (bulb)
      drawRoughLine(nodes.bl[0], nodes.bl[1], cx - 15, cy + 60);
      drawRoughLine(cx + 15, nodes.br[1], nodes.br[0], nodes.br[1]);

      // Vertical wires
      drawRoughLine(nodes.tl[0], nodes.tl[1], nodes.bl[0], nodes.bl[1]);
      drawRoughLine(nodes.tr[0], nodes.tr[1], nodes.br[0], nodes.br[1]);

      // Resistor (middle)
      ctx.beginPath();
      const rStart = cx - 50;
      const rEnd = cx + 50;
      const segs = 6;
      const segW = (rEnd - rStart) / segs;
      ctx.moveTo(rStart, cy);
      for (let i = 0; i < segs; i++) {
        const tX = rStart + segW * (i + 0.5);
        const yOff = (i % 2 === 0 ? -12 : 12) * (1 - uiPhase * 0.2); // flattens slightly
        const rX = tX + (Math.random() - 0.5) * roughness;
        const rY = cy + yOff + (Math.random() - 0.5) * roughness;
        ctx.lineTo(rX, rY);
      }
      ctx.lineTo(rEnd, cy);
      ctx.stroke();

      // Battery (top)
      const batY = cy - 60;
      ctx.beginPath();
      ctx.moveTo(cx - 10, batY - 15);
      ctx.lineTo(cx - 10, batY + 15);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 10, batY - 10);
      ctx.lineTo(cx + 10, batY + 10);
      ctx.stroke();
      ctx.lineWidth = 1.5 + uiPhase * 0.5;

      // Bulb (bottom)
      ctx.beginPath();
      ctx.arc(cx, cy + 60, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 52); ctx.lineTo(cx + 8, cy + 68);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy + 52); ctx.lineTo(cx - 8, cy + 68);
      ctx.stroke();

      // Nodes
      Object.values(nodes).forEach(([nx, ny], i) => {
        // Node light up sequence based on energyPhase
        const nodePhase = Math.max(0, Math.min(1, (energyPhase * 6) - i));
        ctx.fillStyle = energyPhase > 0 ? `rgba(181, 163, 247, ${0.2 + nodePhase * 0.8})` : inactiveColor;
        ctx.shadowBlur = nodePhase * 12;
        ctx.shadowColor = activeGlow;
        ctx.beginPath();
        ctx.arc(nx, ny, 3 + uiPhase, 0, Math.PI * 2);
        ctx.fill();
        
        // UI Selection boxes around nodes when fully morphed
        if (uiPhase > 0) {
          ctx.strokeStyle = `rgba(181, 163, 247, ${uiPhase * 0.5})`;
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
          ctx.strokeRect(nx - 5, ny - 5, 10, 10);
        }
      });

      // Energy Pulse traveling along wires
      if (energyPhase > 0.1) {
        const pulseProgress = (time * 1.5) % 4; // Travel along 4 segments conceptually
        
        ctx.shadowBlur = 15 * energyPhase;
        ctx.fillStyle = `rgba(208, 196, 255, ${0.8 * energyPhase})`;
        
        let px = 0, py = 0;
        if (pulseProgress < 1) { // Left vertical up
          px = nodes.bl[0];
          py = nodes.bl[1] - (nodes.bl[1] - nodes.tl[1]) * pulseProgress;
        } else if (pulseProgress < 2) { // Top horizontal right
          const l = pulseProgress - 1;
          px = nodes.tl[0] + (nodes.tr[0] - nodes.tl[0]) * l;
          py = nodes.tl[1];
        } else if (pulseProgress < 3) { // Right vertical down
          const l = pulseProgress - 2;
          px = nodes.tr[0];
          py = nodes.tr[1] + (nodes.br[1] - nodes.tr[1]) * l;
        } else { // Bottom horizontal left
          const l = pulseProgress - 3;
          px = nodes.br[0] - (nodes.br[0] - nodes.bl[0]) * l;
          py = nodes.br[1];
        }

        ctx.beginPath();
        ctx.arc(px, py, 3 + Math.sin(time*10)*1, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 3. UI Overlay Elements (Fades in with uiPhase) ---
      if (uiPhase > 0.01) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = uiPhase;
        
        // Bounding box around the whole circuit
        ctx.strokeStyle = 'rgba(181, 163, 247, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 150, cy - 90, 300, 180);
        ctx.setLineDash([]);
        
        // Resize handles
        ctx.fillStyle = '#b5a3f7';
        const handles = [
          [cx - 150, cy - 90], [cx, cy - 90], [cx + 150, cy - 90],
          [cx - 150, cy],                     [cx + 150, cy],
          [cx - 150, cy + 90], [cx, cy + 90], [cx + 150, cy + 90]
        ];
        
        handles.forEach(([hx, hy]) => {
          ctx.fillRect(hx - 3, hy - 3, 6, 6);
        });

        // Overlay text/labels
        ctx.font = '12px Inter';
        ctx.fillStyle = '#d0c4ff';
        ctx.textAlign = 'center';
        ctx.fillText('R1 : 100Ω', cx, cy - 25);
        ctx.fillText('9V', cx, cy - 75);
        
        ctx.globalAlpha = 1.0;
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isHovered]);

  return (
    <section className="hero section" id="hero">
      <div className="hero__inner container">
        <div className="hero__text">
          <div className="hero__badge">v1.0 Now Live</div>
          <h1 className="hero__title">
            Design Circuit Diagrams
            <br />
            <span className="hero__title-accent">in Seconds</span>
          </h1>
          <p className="hero__subtitle">
            Fast, clean, and built for real exams.
            <br />
            Hover the canvas to experience the transformation.
          </p>
          <div className="hero__actions">
            <a href="/editor/index.html" className="btn btn-primary" id="hero-start">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Start Drawing
            </a>
            <a href="#preview" className="btn btn-secondary" id="hero-demo">
              ▶ Watch Demo
            </a>
          </div>
        </div>

        <div className="hero__visual">
          <div 
            className={`hero__canvas-wrap glass ${isHovered ? 'is-active' : ''}`}
            ref={containerRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="hero__canvas-toolbar">
              <div className="window-controls">
                <span className="hero__dot hero__dot--red" />
                <span className="hero__dot hero__dot--yellow" />
                <span className="hero__dot hero__dot--green" />
              </div>
              <span className="hero__canvas-title">circuit_diagram.cc</span>
              <div className="hero__status">
                {isHovered ? <span className="status-live">Live</span> : <span className="status-idle">Idle</span>}
              </div>
            </div>
            
            <div className="canvas-interaction-layer">
              <canvas ref={canvasRef} className="hero__canvas" />
              
              {!isHovered && (
                <div className="hover-prompt">
                  Hover to Power On
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
