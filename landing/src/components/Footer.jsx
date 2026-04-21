import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="footer__inner container">
        <span className="footer__brand">CircuitCraft</span>
        <div className="footer__links">
          <a
            href="https://github.com"
            className="footer__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <span className="footer__sep">·</span>
          <span className="footer__link footer__link--muted">
            Made with 💜 by Pratik
          </span>
        </div>
      </div>
    </footer>
  );
}
