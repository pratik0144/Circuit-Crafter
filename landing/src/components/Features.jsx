import './Features.css';

const features = [
  {
    icon: '⚡',
    title: 'Instant Drawing',
    desc: 'Drag, connect, and build circuits effortlessly.',
  },
  {
    icon: '📄',
    title: 'Exam Ready Export',
    desc: 'Export clean A4 diagrams for assignments & exams.',
  },
  {
    icon: '🧠',
    title: 'Smart Tools',
    desc: 'Undo, redo, snapping, alignment, and precision controls.',
  },
];

export default function Features() {
  return (
    <section className="features section" id="features">
      <div className="container">
        <h2 className="features__heading">
          Everything you need.&nbsp;
          <span className="features__heading-muted">Nothing you don't.</span>
        </h2>
        <div className="features__grid">
          {features.map((f, i) => (
            <div className="features__card glass" key={i} id={`feature-card-${i}`}>
              <span className="features__icon">{f.icon}</span>
              <h3 className="features__title">{f.title}</h3>
              <p className="features__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
