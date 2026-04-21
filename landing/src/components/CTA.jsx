import './CTA.css';

export default function CTA() {
  return (
    <section className="cta section" id="cta">
      <div className="container">
        <div className="cta__card glass">
          <div className="cta__glow" />
          <h2 className="cta__title">
            Start Building Your Circuit Now
          </h2>
          <p className="cta__subtitle">
            Free. No sign-up. Just start drawing.
          </p>
          <a href="/editor/index.html" className="btn btn-primary cta__btn" id="cta-launch">
            🚀 Launch Editor
          </a>
        </div>
      </div>
    </section>
  );
}
