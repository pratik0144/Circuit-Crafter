import { useState } from 'react';
import './InteractivePreview.css';

const highlights = [
  {
    id: 'snap',
    label: 'Wire Snapping',
    desc: 'Wires automatically snap to grid points for precise layouts.',
  },
  {
    id: 'place',
    label: 'Component Placement',
    desc: 'Drag components from the panel — resistors, capacitors, switches, and more.',
  },
  {
    id: 'export',
    label: 'Export',
    desc: 'Export as PNG or PDF, perfectly formatted for A4 exam sheets.',
  },
];

export default function InteractivePreview() {
  const [active, setActive] = useState('snap');

  return (
    <section className="preview section" id="preview">
      <div className="container">
        <h2 className="preview__heading">
          See it <span className="preview__heading-accent">in action</span>
        </h2>

        <div className="preview__wrap glass">
          {/* Toolbar */}
          <div className="preview__toolbar">
            <div className="preview__toolbar-group">
              <button className="preview__tool preview__tool--active">↖</button>
              <button className="preview__tool">✏️</button>
              <button className="preview__tool">⬜</button>
              <button className="preview__tool">─</button>
            </div>
            <div className="preview__toolbar-sep" />
            <div className="preview__toolbar-group">
              <button className="preview__tool">↩️</button>
              <button className="preview__tool">↪️</button>
            </div>
            <div className="preview__toolbar-sep" />
            <div className="preview__toolbar-group">
              <button className="preview__tool preview__tool--export">📥 Export</button>
            </div>
          </div>

          {/* Canvas area */}
          <div className="preview__canvas">
            {/* Grid dots */}
            <div className="preview__grid" />

            {/* Mock circuit */}
            <svg className="preview__circuit" viewBox="0 0 500 260" fill="none">
              {/* Wire path */}
              <path
                d="M60 130 L160 130 L160 60 L340 60 L340 130 L440 130"
                stroke="rgba(181,163,247,0.4)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M60 130 L160 130 L160 200 L340 200 L340 130 L440 130"
                stroke="rgba(181,163,247,0.4)"
                strokeWidth="2"
                fill="none"
              />

              {/* Resistor symbol */}
              <path
                d="M200 60 L210 48 L220 72 L230 48 L240 72 L250 48 L260 72 L270 48 L280 60"
                stroke="#b5a3f7"
                strokeWidth="2"
                fill="none"
                className={active === 'place' ? 'preview__highlight' : ''}
              />
              <text x="240" y="42" fill="rgba(181,163,247,0.5)" fontSize="10" textAnchor="middle">R₁ 100Ω</text>

              {/* Battery */}
              <line x1="240" y1="188" x2="240" y2="212" stroke="#8f7af5" strokeWidth="2" />
              <line x1="260" y1="192" x2="260" y2="208" stroke="#8f7af5" strokeWidth="3" />
              <text x="265" y="218" fill="rgba(181,163,247,0.5)" fontSize="10">9V</text>

              {/* Switch */}
              <circle cx="60" cy="130" r="4" fill="#b5a3f7" className="preview__node-active" />
              <circle cx="440" cy="130" r="4" fill="#b5a3f7" className="preview__node-active" />

              {/* Snap indicators */}
              {active === 'snap' && (
                <>
                  <circle cx="160" cy="130" r="6" fill="none" stroke="#b5a3f7" strokeWidth="1.5" strokeDasharray="3 3" className="preview__pulse" />
                  <circle cx="340" cy="130" r="6" fill="none" stroke="#b5a3f7" strokeWidth="1.5" strokeDasharray="3 3" className="preview__pulse" />
                  <circle cx="160" cy="60" r="6" fill="none" stroke="#b5a3f7" strokeWidth="1.5" strokeDasharray="3 3" className="preview__pulse" />
                  <circle cx="340" cy="60" r="6" fill="none" stroke="#b5a3f7" strokeWidth="1.5" strokeDasharray="3 3" className="preview__pulse" />
                </>
              )}

              {/* Export frame */}
              {active === 'export' && (
                <rect
                  x="30"
                  y="20"
                  width="440"
                  height="220"
                  rx="8"
                  stroke="#b5a3f7"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  fill="none"
                  className="preview__export-frame"
                />
              )}
            </svg>
          </div>

          {/* Feature highlights */}
          <div className="preview__features">
            {highlights.map((h) => (
              <button
                key={h.id}
                className={`preview__feature ${active === h.id ? 'preview__feature--active' : ''}`}
                onClick={() => setActive(h.id)}
                id={`preview-feature-${h.id}`}
              >
                <span className="preview__feature-label">{h.label}</span>
                <span className="preview__feature-desc">{h.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
