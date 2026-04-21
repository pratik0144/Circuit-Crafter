import './WhySection.css';

export default function WhySection() {
  return (
    <section className="why section" id="why">
      <div className="container">
        <div className="why__content">
          <span className="why__badge">The Problem</span>
          <h2 className="why__title">
            Because drawing circuits manually is
            <br />
            <span className="why__title-accent">slow, messy, and frustrating.</span>
          </h2>

          <div className="why__comparison">
            {/* Messy Draft */}
            <div className="why__card why__card--messy glass">
              <div className="why__card-visual">
                <svg viewBox="0 0 300 150" className="why__svg-messy">
                  <path d="M 30 75 Q 80 85 100 70 T 200 80" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
                  <path d="M 100 70 L 110 50 L 120 90 L 130 50 L 140 90 L 150 70" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
                  <circle cx="200" cy="80" r="12" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
                  <path d="M 192 72 L 208 88 M 192 88 L 208 72" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                  <text x="125" y="40" fill="rgba(255,255,255,0.4)" fontSize="12" style={{fontFamily: 'cursive'}}>R1 = 1k</text>
                  <text x="50" y="65" fill="rgba(255,255,255,0.4)" fontSize="12" style={{fontFamily: 'cursive'}}>9V</text>
                  <path d="M 10 30 C 50 10, 250 140, 290 120" stroke="rgba(255,0,0,0.2)" strokeWidth="1" fill="none" strokeDasharray="4 4"/>
                </svg>
              </div>
              <div className="why__card-label">Manual Draft</div>
            </div>

            {/* Clean CircuitCraft */}
            <div className="why__card why__card--clean glass">
              <div className="why__card-visual">
                <svg viewBox="0 0 300 150" className="why__svg-clean">
                  <path d="M 40 75 L 100 75 M 150 75 L 210 75" stroke="#b5a3f7" strokeWidth="2" fill="none" />
                  <path d="M 100 75 L 108 60 L 125 90 L 142 60 L 150 75" stroke="#b5a3f7" strokeWidth="2" fill="none" />
                  <circle cx="210" cy="75" r="14" stroke="#b5a3f7" strokeWidth="2" fill="none" />
                  <path d="M 200 65 L 220 85 M 200 85 L 220 65" stroke="#b5a3f7" strokeWidth="2" />
                  <text x="125" y="45" fill="#d0c4ff" fontSize="12" textAnchor="middle" fontWeight="600">R₁ 1kΩ</text>
                  <text x="60" y="65" fill="#d0c4ff" fontSize="12" fontWeight="600">9V</text>
                  <circle cx="40" cy="75" r="3" fill="#b5a3f7" />
                  <circle cx="210" cy="75" r="3" fill="#b5a3f7" />
                </svg>
              </div>
              <div className="why__card-label why__card-label--accent">CircuitCraft</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
