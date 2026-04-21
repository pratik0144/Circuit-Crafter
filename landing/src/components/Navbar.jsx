import { useState, useEffect } from 'react';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="navbar">
      <div className="navbar__inner container">
        <a href="#" className="navbar__logo" id="nav-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="24" height="24" rx="6" stroke="#b5a3f7" strokeWidth="2" />
            <circle cx="9" cy="14" r="2.5" fill="#b5a3f7" />
            <circle cx="19" cy="14" r="2.5" fill="#8f7af5" />
            <line x1="11.5" y1="14" x2="16.5" y2="14" stroke="#b5a3f7" strokeWidth="1.5" />
            <line x1="9" y1="7" x2="9" y2="11.5" stroke="#b5a3f7" strokeWidth="1.5" />
            <line x1="19" y1="16.5" x2="19" y2="21" stroke="#8f7af5" strokeWidth="1.5" />
          </svg>
          <span>CircuitCraft</span>
        </a>

        <div className="navbar__links">
          <a href="#features" className="navbar__link" id="nav-features">Features</a>
          <a
            href="https://github.com"
            className="navbar__link"
            id="nav-github"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a href="/editor/index.html" className="btn btn-primary navbar__cta" id="nav-launch">
            Launch App
          </a>
        </div>
      </div>
    </nav>
  );
}
