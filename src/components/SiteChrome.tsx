import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const navigation = [
  ['Home', '/'],
  ['About', '/about'],
  ['Projects', '/projects'],
  ['Research', '/research'],
  ['Contact', '/contact'],
] as const;

const resumeUrl = `${import.meta.env.BASE_URL}Mohammad_Meraj_Resume.pdf`;

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Mohammad Meraj, home">
      <span className="brand-mark" aria-hidden="true">MM</span>
      <span className="brand-copy"><strong>Mohammad Meraj</strong></span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <button ref={toggleRef} className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-nav" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setOpen(!open)}>
          <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
        </button>
        <nav id="site-nav" className={open ? 'nav nav-open' : 'nav'} aria-label="Main navigation">
          {navigation.map(([label, path]) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>{label}</NavLink>
          ))}
          <a className="nav-resume" href={resumeUrl} target="_blank" rel="noreferrer">Resume<span className="visually-hidden"> (PDF, opens in a new tab)</span></a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p>© {new Date().getFullYear()} All rights reserved.</p>
      </div>
    </footer>
  );
}
